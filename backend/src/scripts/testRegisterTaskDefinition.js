const { loadServices } = require("../utils/serviceStorage");
const { awsSettings } = require("../config/aws");
const { getEcrImageUri } = require("../services/awsDeploymentService");
const { registerTaskDefinition } = require("../services/ecsTaskService");

const run = async () => {
  const serviceId = process.argv[2];

  if (!serviceId) {
    console.error("Usage: node src/scripts/testRegisterTaskDefinition.js <serviceId>");
    return;
  }

  const service = loadServices().find((s) => s.id === serviceId);

  if (!service) {
    console.error(`Service not found: ${serviceId}`);
    return;
  }

  const missing = ["executionRoleArn", "logGroupName", "region"].filter(
    (key) => !awsSettings[key]
  );

  if (missing.length > 0) {
    console.error(`Missing env values: ${missing.join(", ")}`);
    return;
  }

  const imageUri = getEcrImageUri(service);

  console.log(`Service: ${service.name}`);
  console.log(`Image: ${imageUri}`);
  console.log(`Port: ${service.port}`);
  console.log(`Log group: ${awsSettings.logGroupName}`);
  console.log("");
  console.log("Registering task definition...");

  try {
    const arn = await registerTaskDefinition({
      id: service.id,
      imageUri,
      port: service.port,
    });

    console.log("");
    console.log(`Done: ${arn}`);
  } catch (error) {
    console.error("");
    console.error("Registration failed:");
    console.error(error);
  }
};

run();
