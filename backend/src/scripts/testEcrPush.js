const { loadServices } = require("../utils/serviceStorage");
const { pushImageToEcr, getEcrImageUri } = require("../services/awsDeploymentService");

const run = async () => {
  const serviceId = process.argv[2];

  if (!serviceId) {
    console.error("Usage: node src/scripts/testEcrPush.js <serviceId>");
    return;
  }

  const service = loadServices().find((s) => s.id === serviceId);

  if (!service) {
    console.error(`Service not found: ${serviceId}`);
    return;
  }

  if (!service.dockerImageName) {
    console.error("This service has no local Docker image. Deploy it locally first.");
    return;
  }

  console.log(`Service: ${service.name}`);
  console.log(`Local image: ${service.dockerImageName}`);
  console.log(`Target: ${getEcrImageUri(service)}`);
  console.log("");

  try {
    const imageUri = await pushImageToEcr(service, service.dockerImageName);
    console.log("");
    console.log(`Done: ${imageUri}`);
  } catch (error) {
    console.error("");
    console.error("Push failed:");
    console.error(error);
  }
};

run();
