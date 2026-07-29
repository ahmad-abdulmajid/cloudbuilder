const {
  pushDeploymentHistory,
  updateDeploymentHistoryEntry,
} = require("../utils/serviceStorage");
const {
  prepareBuild,
  updateService,
  getServiceDeployPath,
} = require("./deploymentService");
const { pushImageToEcr } = require("./awsDeploymentService");
const { registerTaskDefinition } = require("./ecsTaskService");
const {
  runTask,
  waitForTaskRunning,
  getTaskPublicIp,
  stopTask,
} = require("./ecsRunService");

function newHistoryRecord(type) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    status: "in-progress",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };
}

/**
 * Deploys a service to AWS Fargate.
 *
 * clone -> build -> push to ECR -> register task definition -> run task
 * -> wait for RUNNING -> resolve public IP
 *
 * If anything fails after the task has been started, the task is stopped
 * before the failure is recorded. A task that nobody is tracking keeps
 * billing, so cleanup is not optional here.
 *
 * @param {Object} service
 */
async function startAwsDeployment(service) {
  const serviceDeployPath = getServiceDeployPath(service);
  const historyRecord = newHistoryRecord("deploy");

  pushDeploymentHistory(service.id, historyRecord);

  // Declared outside the try so the catch can still reach it.
  let startedTaskArn = null;

  try {
    console.log(`Starting AWS deployment for service: ${service.name}`);

    const { imageName } = await prepareBuild(service);

    console.log("Pushing image to ECR");

    const imageUri = await pushImageToEcr(service, imageName);

    updateService(service.id, {
      status: "pushed",
      localPath: serviceDeployPath,
      dockerImageName: imageName,
      ecrImageUri: imageUri,
    });

    console.log("Registering task definition");

    const taskDefinitionArn = await registerTaskDefinition({
      id: service.id,
      imageUri,
      port: service.port,
    });

    console.log(`Task definition registered: ${taskDefinitionArn}`);
    console.log("Starting Fargate task (billing starts now)");

    startedTaskArn = await runTask(taskDefinitionArn);

    // Persist the ARN immediately. If the process dies after this point,
    // this is the only record that a billable task exists.
    updateService(service.id, {
      taskArn: startedTaskArn,
      taskDefinitionArn,
    });

    console.log(`Task started: ${startedTaskArn}`);
    console.log("Waiting for task to reach RUNNING");

    const task = await waitForTaskRunning(startedTaskArn);

    console.log("Task is running, resolving public IP");

    const publicIp = await getTaskPublicIp(task);

    if (!publicIp) {
      throw new Error("Task is running but no public IP was assigned");
    }

    const finishedAt = new Date().toISOString();

    updateService(service.id, {
      status: "deployed",
      lastDeploymentFinishedAt: finishedAt,
      deploymentError: null,
      publicIp,
      serviceUrl: `http://${publicIp}:${service.port}`,
    });

    updateDeploymentHistoryEntry(service.id, historyRecord.id, {
      status: "success",
      finishedAt,
      error: null,
    });

    console.log(`AWS deployment successful: http://${publicIp}:${service.port}`);
  } catch (error) {
    console.log("AWS deployment failed:", error);

    // If a task was started before the failure, stop it. Otherwise it
    // keeps running and billing with nothing tracking it.
    if (startedTaskArn) {
      console.log("Stopping task started before the failure");

      try {
        await stopTask(startedTaskArn);
        console.log("Task stopped");
      } catch (stopError) {
        console.log("Failed to stop task, it may still be billing:", stopError);
      }
    }

    const finishedAt = new Date().toISOString();
    const errorMessage = error?.message || String(error);

    updateService(service.id, {
      status: "failed",
      lastDeploymentFinishedAt: finishedAt,
      deploymentError: errorMessage,
      localPath: serviceDeployPath,
      taskArn: null,
      publicIp: null,
    });

    updateDeploymentHistoryEntry(service.id, historyRecord.id, {
      status: "failed",
      finishedAt,
      error: errorMessage,
    });
  }
}

/**
 * Stops a service's running Fargate task.
 *
 * StopTask returns as soon as AWS accepts the request, not when the
 * container is actually gone, so the service is marked as stopped
 * optimistically. Billing ends when the task reaches STOPPED, which
 * usually takes a few seconds longer.
 *
 * @param {Object} service
 * @returns {Promise<Object>} the updated service
 */
async function stopAwsDeployment(service) {
  const historyRecord = newHistoryRecord("undeploy");

  pushDeploymentHistory(service.id, historyRecord);

  try {
    if (!service.taskArn) {
      console.log("No task ARN recorded, nothing to stop");
    } else {
      console.log(`Stopping task: ${service.taskArn}`);
      await stopTask(service.taskArn);
      console.log("Stop requested");
    }

    const finishedAt = new Date().toISOString();

    const updatedService = updateService(service.id, {
      status: "created",
      serviceUrl: null,
      publicIp: null,
      taskArn: null,
      deploymentError: null,
      lastUndeployedAt: finishedAt,
    });

    updateDeploymentHistoryEntry(service.id, historyRecord.id, {
      status: "success",
      finishedAt,
      error: null,
    });

    return updatedService;
  } catch (error) {
    console.log("AWS undeploy failed:", error);

    const finishedAt = new Date().toISOString();
    const errorMessage = error?.message || String(error);

    // taskArn is deliberately NOT cleared here. The stop failed, so the
    // task may still be running and we need the ARN to try again.
    const updatedService = updateService(service.id, {
      status: "failed",
      deploymentError: errorMessage,
      lastUndeployedAt: finishedAt,
    });

    updateDeploymentHistoryEntry(service.id, historyRecord.id, {
      status: "failed",
      finishedAt,
      error: errorMessage,
    });

    return updatedService;
  }
}

module.exports = {
  startAwsDeployment,
  stopAwsDeployment,
};
