const { loadServices, saveServices } = require("./serviceStorage");

const INTERRUPTED_MESSAGE = "Deployment interrupted by server restart";

const recoverInterruptedDeployments = () => {
  const services = loadServices();
  const finishedAt = new Date().toISOString();
  let recoveredCount = 0;

  services.forEach((service) => {
    if (service.status !== "building") {
      return;
    }

    service.status = "failed";
    service.lastDeploymentFinishedAt = finishedAt;
    service.deploymentError = INTERRUPTED_MESSAGE;

    if (Array.isArray(service.deploymentHistory)) {
      service.deploymentHistory
        .filter((record) => record.status === "in-progress")
        .forEach((record) => {
          record.status = "failed";
          record.finishedAt = finishedAt;
          record.error = INTERRUPTED_MESSAGE;
        });
    }

    recoveredCount += 1;
    console.log(`Recovered interrupted deployment for service: ${service.name}`);
  });

  if (recoveredCount > 0) {
    saveServices(services);
    console.log(`Recovery sweep: ${recoveredCount} interrupted deployment(s) marked as failed`);
  }

  return recoveredCount;
};

module.exports = recoverInterruptedDeployments;