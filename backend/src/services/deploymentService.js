const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { loadServices, saveServices } = require("../utils/serviceStorage");

// __dirname is backend/src/services
// "../.." goes to backend
// deployments will be stored in backend/deployments, outside src.
// This prevents nodemon from restarting during deployment.
const deploymentsRoot = path.join(__dirname, "..", "..", "deployments");

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        timeout: options.timeout || 60000,
        cwd: options.cwd || undefined,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(stderr || error.message);
          return;
        }

        resolve(stdout);
      }
    );
  });
}

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

async function removeExistingContainer(containerName) {
  try {
    await runCommand("docker", ["rm", "-f", containerName], {
      timeout: 30000,
    });
  } catch (error) {
    // It is okay if the container does not exist.
  }
}

async function startLocalDeployment(service) {
  const serviceDeployPath = path.join(deploymentsRoot, service.id);
  const imageName = getDockerImageName(service);
  const containerName = getDockerContainerName(service);

  try {
    console.log(`Starting deployment for service: ${service.name}`);

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
      console.log("Deployment failed: Dockerfile not found");

      updateService(service.id, {
        status: "failed",
        lastDeploymentFinishedAt: new Date().toISOString(),
        deploymentError: "Dockerfile not found in repository",
        localPath: serviceDeployPath,
      });

      return;
    }

    console.log("Dockerfile found");
    console.log(`Building Docker image: ${imageName}`);

    await runCommand("docker", ["build", "-t", imageName, "."], {
      cwd: serviceDeployPath,
      timeout: 120000,
    });

    console.log("Docker image built successfully");

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

    updateService(service.id, {
      status: "deployed",
      lastDeploymentFinishedAt: new Date().toISOString(),
      deploymentError: null,
      localPath: serviceDeployPath,
      dockerImageName: imageName,
      dockerContainerName: containerName,
      serviceUrl: `http://localhost:${service.port}`,
    });
  } catch (error) {
    console.log("Deployment failed:", error);

    updateService(service.id, {
      status: "failed",
      lastDeploymentFinishedAt: new Date().toISOString(),
      deploymentError: String(error),
      localPath: serviceDeployPath,
      dockerImageName: imageName,
      dockerContainerName: containerName,
    });
  }
}

async function stopLocalDeployment(service) {
  const containerName = service.dockerContainerName || getDockerContainerName(service);

  try {
    console.log(`Stopping container for service: ${service.name}`);
    console.log(`Removing container: ${containerName}`);

    await removeExistingContainer(containerName);

    const updatedService = updateService(service.id, {
      status: "created",
      serviceUrl: null,
      dockerContainerName: null,
      deploymentError: null,
      lastUndeployedAt: new Date().toISOString(),
    });

    console.log("Container removed successfully");

    return updatedService;
  } catch (error) {
    console.log("Undeploy failed:", error);

    const updatedService = updateService(service.id, {
      status: "failed",
      deploymentError: String(error),
      lastUndeployedAt: new Date().toISOString(),
    });

    return updatedService;
  }
}

module.exports = {
  startLocalDeployment,
  stopLocalDeployment,
};