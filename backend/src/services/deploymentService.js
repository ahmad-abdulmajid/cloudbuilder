const fs = require("fs");
const path = require("path");
const { runCommand } = require("../utils/runCommand");
const {
  loadServices,
  saveServices,
  pushDeploymentHistory,
  updateDeploymentHistoryEntry,
} = require("../utils/serviceStorage");

// __dirname is backend/src/services
// "../.." goes to backend
// deployments will be stored in backend/deployments, outside src.
// This prevents nodemon from restarting during deployment.
const deploymentsRoot = path.join(__dirname, "..", "..", "deployments");

function updateService(serviceId, updates) {
  const services = loadServices();
  const service = services.find((s) => s.id === serviceId);

  if (!service) {
    return null;
  }

  Object.assign(service, updates);
  saveServices(services);

  return service;
}

function getDockerImageName(service) {
  return `cloudbuilder-${service.id}`.toLowerCase();
}

function getDockerContainerName(service) {
  return `cloudbuilder-container-${service.id}`.toLowerCase();
}

function getServiceDeployPath(service) {
  return path.join(deploymentsRoot, service.id);
}

async function removeExistingContainer(containerName) {
  try {
    await runCommand("docker", ["rm", "-f", containerName], {
      timeout: 30000,
    });
  } catch (error) {
    // It is okay if the container does not exist.
  }
}

/**
 * Shared first half of every deployment, local or cloud:
 * clone the repository, verify it contains a Dockerfile, build the image.
 *
 * Throws on failure. The caller is responsible for recording the error
 * against the service and its deployment history.
 *
 * @param {Object} service
 * @returns {Promise<{serviceDeployPath: string, imageName: string}>}
 */
async function prepareBuild(service) {
  const serviceDeployPath = getServiceDeployPath(service);
  const imageName = getDockerImageName(service);

  if (!fs.existsSync(deploymentsRoot)) {
    fs.mkdirSync(deploymentsRoot, { recursive: true });
  }

  if (fs.existsSync(serviceDeployPath)) {
    fs.rmSync(serviceDeployPath, { recursive: true, force: true });
  }

  console.log(`Cloning repository: ${service.repoUrl}`);

  await runCommand("git", [
    "clone",
    "--depth",
    "1",
    service.repoUrl,
    serviceDeployPath,
  ]);

  console.log("Repository cloned successfully");

  const dockerfilePath = path.join(serviceDeployPath, "Dockerfile");

  if (!fs.existsSync(dockerfilePath)) {
    throw new Error("Dockerfile not found in repository");
  }

  console.log("Dockerfile found");
  console.log(`Building Docker image: ${imageName}`);

  await runCommand("docker", ["build", "-t", imageName, "."], {
    cwd: serviceDeployPath,
    timeout: 120000,
  });

  console.log("Docker image built successfully");

  return { serviceDeployPath, imageName };
}

async function startLocalDeployment(service) {
  const serviceDeployPath = getServiceDeployPath(service);
  const imageName = getDockerImageName(service);
  const containerName = getDockerContainerName(service);

  const historyRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "deploy",
    status: "in-progress",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };

  pushDeploymentHistory(service.id, historyRecord);

  try {
    console.log(`Starting deployment for service: ${service.name}`);

    await prepareBuild(service);

    console.log(`Removing old container if it exists: ${containerName}`);
    await removeExistingContainer(containerName);

    console.log(`Running Docker container: ${containerName}`);

    await runCommand("docker", [
      "run",
      "-d",
      "--name",
      containerName,
      "-p",
      `${service.port}:${service.port}`,
      imageName,
    ]);

    console.log("Docker container started successfully");

    const finishedAt = new Date().toISOString();

    updateService(service.id, {
      status: "deployed",
      lastDeploymentFinishedAt: finishedAt,
      deploymentError: null,
      localPath: serviceDeployPath,
      dockerImageName: imageName,
      dockerContainerName: containerName,
      serviceUrl: `http://localhost:${service.port}`,
    });

    updateDeploymentHistoryEntry(service.id, historyRecord.id, {
      status: "success",
      finishedAt,
      error: null,
    });
  } catch (error) {
    console.log("Deployment failed:", error);

    const finishedAt = new Date().toISOString();
    const errorMessage = error?.message || String(error);

    updateService(service.id, {
      status: "failed",
      lastDeploymentFinishedAt: finishedAt,
      deploymentError: errorMessage,
      localPath: serviceDeployPath,
      dockerImageName: imageName,
      dockerContainerName: containerName,
    });

    updateDeploymentHistoryEntry(service.id, historyRecord.id, {
      status: "failed",
      finishedAt,
      error: errorMessage,
    });
  }
}

async function stopLocalDeployment(service) {
  const containerName = service.dockerContainerName || getDockerContainerName(service);

  const historyRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "undeploy",
    status: "in-progress",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };

  pushDeploymentHistory(service.id, historyRecord);

  try {
    console.log(`Stopping container for service: ${service.name}`);
    console.log(`Removing container: ${containerName}`);

    await removeExistingContainer(containerName);

    const finishedAt = new Date().toISOString();

    const updatedService = updateService(service.id, {
      status: "created",
      serviceUrl: null,
      dockerContainerName: null,
      deploymentError: null,
      lastUndeployedAt: finishedAt,
    });

    updateDeploymentHistoryEntry(service.id, historyRecord.id, {
      status: "success",
      finishedAt,
      error: null,
    });

    console.log("Container removed successfully");

    return updatedService;
  } catch (error) {
    console.log("Undeploy failed:", error);

    const finishedAt = new Date().toISOString();
    const errorMessage = error?.message || String(error);

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
  prepareBuild,
  updateService,
  getDockerImageName,
  getDockerContainerName,
  getServiceDeployPath,
  startLocalDeployment,
  stopLocalDeployment,
};
