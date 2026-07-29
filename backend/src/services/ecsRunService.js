const {
  RunTaskCommand,
  StopTaskCommand,
  DescribeTasksCommand,
} = require("@aws-sdk/client-ecs");
const { DescribeNetworkInterfacesCommand } = require("@aws-sdk/client-ec2");
const { ecsClient, ec2Client, awsSettings } = require("../config/aws");

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 30; // ~90 seconds

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Starts a Fargate task from a given task definition ARN.
 * Returns immediately with the task ARN — the task is not necessarily
 * running yet. Use waitForTaskRunning to block until it is.
 *
 * @param {string} taskDefinitionArn
 * @returns {Promise<string>} the started task's ARN
 */
async function runTask(taskDefinitionArn) {
  const command = new RunTaskCommand({
    cluster: awsSettings.ecsClusterName,
    taskDefinition: taskDefinitionArn,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: awsSettings.subnetIds,
        securityGroups: [awsSettings.securityGroupId],
        assignPublicIp: "ENABLED",
      },
    },
  });

  const response = await ecsClient.send(command);

  if (response.failures && response.failures.length > 0) {
    const reasons = response.failures.map((f) => f.reason).join(", ");
    throw new Error(`RunTask failed: ${reasons}`);
  }

  return response.tasks[0].taskArn;
}

/**
 * Polls DescribeTasks until the task reaches RUNNING (or STOPPED, which
 * means it crashed on startup — e.g. wrong image architecture, missing
 * env var the app requires, or app crashing on boot).
 *
 * @param {string} taskArn
 * @returns {Promise<Object>} the final task description
 */
async function waitForTaskRunning(taskArn) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const command = new DescribeTasksCommand({
      cluster: awsSettings.ecsClusterName,
      tasks: [taskArn],
    });

    const response = await ecsClient.send(command);
    const task = response.tasks[0];

    if (!task) {
      throw new Error("Task disappeared while polling — check the cluster manually.");
    }

    if (task.lastStatus === "RUNNING") {
      return task;
    }

    if (task.lastStatus === "STOPPED") {
      const reason = task.stoppedReason || "unknown reason";
      throw new Error(`Task stopped before becoming RUNNING: ${reason}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Task did not reach RUNNING within ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

/**
 * Extracts the ENI id from a task's network attachments, then resolves
 * its public IP via EC2. Only call this once the task is RUNNING —
 * the ENI may not be attached yet during PROVISIONING.
 *
 * @param {Object} task - a task object as returned by DescribeTasks
 * @returns {Promise<string|null>} the public IP, or null if none assigned
 */
async function getTaskPublicIp(task) {
  const eniAttachment = task.attachments.find((a) => a.type === "ElasticNetworkInterface");

  if (!eniAttachment) {
    return null;
  }

  const eniIdDetail = eniAttachment.details.find((d) => d.name === "networkInterfaceId");

  if (!eniIdDetail) {
    return null;
  }

  const command = new DescribeNetworkInterfacesCommand({
    NetworkInterfaceIds: [eniIdDetail.value],
  });

  const response = await ec2Client.send(command);
  const eni = response.NetworkInterfaces[0];

  return eni?.Association?.PublicIp || null;
}

/**
 * Stops a running task. Idempotent-ish: stopping an already-stopped
 * task does not throw.
 *
 * @param {string} taskArn
 */
async function stopTask(taskArn) {
  const command = new StopTaskCommand({
    cluster: awsSettings.ecsClusterName,
    task: taskArn,
    reason: "Stopped by CloudBuilder",
  });

  await ecsClient.send(command);
}

module.exports = {
  runTask,
  waitForTaskRunning,
  getTaskPublicIp,
  stopTask,
};
