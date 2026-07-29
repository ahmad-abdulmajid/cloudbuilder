const readline = require("readline");
const { loadServices } = require("../utils/serviceStorage");
const { awsSettings } = require("../config/aws");
const { getEcrImageUri } = require("../services/awsDeploymentService");
const { registerTaskDefinition } = require("../services/ecsTaskService");
const {
  runTask,
  waitForTaskRunning,
  getTaskPublicIp,
  stopTask,
} = require("../services/ecsRunService");

let startedTaskArn = null;
let alreadyStopping = false;

async function ensureStopped() {
  if (!startedTaskArn || alreadyStopping) {
    return;
  }

  alreadyStopping = true;

  console.log("");
  console.log("Stopping task...");

  try {
    await stopTask(startedTaskArn);
    console.log("Stop requested. Billing ends once the task reaches STOPPED.");
  } catch (error) {
    console.error("STOP FAILED — stop it manually, it is still billing:");
    console.error(`aws ecs stop-task --cluster ${awsSettings.ecsClusterName} --task ${startedTaskArn} --region ${awsSettings.region}`);
    console.error(error);
  }
}

// If the user presses Ctrl+C, still stop the task before exiting.
process.on("SIGINT", async () => {
  console.log("");
  console.log("Interrupted.");
  await ensureStopped();
  process.exit(0);
});

function waitForEnter(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

const run = async () => {
  const serviceId = process.argv[2];

  if (!serviceId) {
    console.error("Usage: node src/scripts/testRunTask.js <serviceId>");
    return;
  }

  const service = loadServices().find((s) => s.id === serviceId);

  if (!service) {
    console.error(`Service not found: ${serviceId}`);
    return;
  }

  const missing = ["ecsClusterName", "securityGroupId", "executionRoleArn"].filter(
    (key) => !awsSettings[key]
  );

  if (awsSettings.subnetIds.length === 0) {
    missing.push("subnetIds");
  }

  if (missing.length > 0) {
    console.error(`Missing env values: ${missing.join(", ")}`);
    return;
  }

  const imageUri = getEcrImageUri(service);

  console.log("=".repeat(60));
  console.log("THIS STARTS A BILLABLE FARGATE TASK");
  console.log("0.25 vCPU / 0.5 GB is roughly $0.012 per hour, billed per second.");
  console.log("The script stops the task before it exits, including on Ctrl+C.");
  console.log("=".repeat(60));
  console.log("");
  console.log(`Service: ${service.name}`);
  console.log(`Image:   ${imageUri}`);
  console.log(`Port:    ${service.port}`);
  console.log(`Cluster: ${awsSettings.ecsClusterName}`);
  console.log("");

  await waitForEnter("Press Enter to launch, or Ctrl+C to abort: ");

  try {
    console.log("");
    console.log("Registering task definition...");

    const taskDefinitionArn = await registerTaskDefinition({
      id: service.id,
      imageUri,
      port: service.port,
    });

    console.log(`Registered: ${taskDefinitionArn}`);
    console.log("");
    console.log("Starting task...");

    startedTaskArn = await runTask(taskDefinitionArn);

    console.log(`Task ARN: ${startedTaskArn}`);
    console.log("");
    console.log("Waiting for RUNNING (this usually takes 30-60 seconds)...");

    const task = await waitForTaskRunning(startedTaskArn);

    console.log(`Status: ${task.lastStatus}`);
    console.log("");
    console.log("Resolving public IP...");

    const publicIp = await getTaskPublicIp(task);

    if (!publicIp) {
      console.log("No public IP found. Check assignPublicIp and subnet settings.");
    } else {
      console.log("");
      console.log("-".repeat(60));
      console.log(`Public IP: ${publicIp}`);
      console.log(`URL:       http://${publicIp}:${service.port}`);
      console.log("-".repeat(60));
      console.log("");
      console.log("Test it now from another terminal, for example:");
      console.log(`  curl http://${publicIp}:${service.port}/`);
      console.log("");
    }

    await waitForEnter("Press Enter when finished testing, to stop the task: ");
  } catch (error) {
    console.error("");
    console.error("Run failed:");
    console.error(error.message || error);
  } finally {
    await ensureStopped();
  }
};

run();
