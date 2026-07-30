const { loadServices, saveServices } = require("../utils/serviceStorage");
const {
  startLocalDeployment,
  stopLocalDeployment,
} = require("../services/deploymentService");
const {
  startAwsDeployment,
  stopAwsDeployment,
} = require("../services/awsDeploymentFlow");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const ALLOWED_TARGETS = ["local", "aws"];

/**
 * Normalizes a deployment target.
 * Services created before the target field existed have no target,
 * so anything that is not explicitly "aws" is treated as local.
 */
function resolveTarget(target) {
  return target === "aws" ? "aws" : "local";
}

/**
 * Picks the deployment implementation for a given target.
 *
 * This takes a target rather than a service on purpose. Deploying and
 * stopping ask different questions: a deploy uses the target the user
 * currently wants, while a stop must use the target the workload was
 * actually started with. Passing the target explicitly forces each call
 * site to say which one it means.
 */
function getHandlersForTarget(target) {
  if (resolveTarget(target) === "aws") {
    return { start: startAwsDeployment, stop: stopAwsDeployment };
  }

  return { start: startLocalDeployment, stop: stopLocalDeployment };
}

/**
 * The target a running workload was started with.
 * Falls back to the current target for services deployed before
 * deployedTarget was recorded.
 */
function getDeployedTarget(service) {
  return service.deployedTarget || service.target;
}

const createService = asyncHandler(async (req, res) => {
  const { name, repoUrl, port, target } = req.body;

  const trimmedName = name?.trim();
  const trimmedRepoUrl = repoUrl?.trim();
  const numericPort = Number(port);
  const selectedTarget = target || "local";

  if (!trimmedName || !trimmedRepoUrl || !port) {
    throw new AppError("Name, repo URL, and port are required", 400);
  }

  const githubUrlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/;

  if (!githubUrlPattern.test(trimmedRepoUrl)) {
    throw new AppError("Repo URL must be a valid GitHub repository link", 400);
  }

  if (isNaN(numericPort) || numericPort < 1 || numericPort > 65535) {
    throw new AppError("Port must be a number between 1 and 65535", 400);
  }

  if (!ALLOWED_TARGETS.includes(selectedTarget)) {
    throw new AppError("Target must be either 'local' or 'aws'", 400);
  }

  const services = loadServices();

  const duplicateName = services.find(
    (service) => service.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (duplicateName) {
    throw new AppError("A service with this name already exists", 409);
  }

  const duplicateRepo = services.find(
    (service) => service.repoUrl.toLowerCase() === trimmedRepoUrl.toLowerCase()
  );

  if (duplicateRepo) {
    throw new AppError("A service with this repository URL already exists", 409);
  }

  const newService = {
    id: Date.now().toString(),
    name: trimmedName,
    repoUrl: trimmedRepoUrl,
    port: numericPort,
    target: selectedTarget,
    // Set when a deployment is dispatched, so cleanup can stop what was
    // actually started even if target changes afterwards.
    deployedTarget: null,
    status: "created",
    createdAt: new Date().toISOString(),
    lastDeploymentStartedAt: null,
    lastDeploymentFinishedAt: null,
    lastUndeployedAt: null,
    deploymentError: null,
    localPath: null,
    dockerImageName: null,
    dockerContainerName: null,
    serviceUrl: null,
    // AWS-only fields, unused when target is "local"
    ecrImageUri: null,
    taskDefinitionArn: null,
    taskArn: null,
    publicIp: null,
    deploymentHistory: [],
  };

  services.push(newService);
  saveServices(services);

  return res.status(201).json(newService);
});

const getAllServices = asyncHandler(async (req, res) => {
  const services = loadServices();
  return res.status(200).json(services);
});

const getServiceById = asyncHandler(async (req, res) => {
  const services = loadServices();
  const service = services.find((s) => s.id === req.params.id);

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  return res.status(200).json(service);
});

const updateServiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["created", "building", "pushed", "deployed", "failed"];

  if (!status) {
    throw new AppError("Status is required", 400);
  }

  if (!allowedStatuses.includes(status)) {
    throw new AppError("Invalid status value", 400);
  }

  const services = loadServices();
  const service = services.find((s) => s.id === req.params.id);

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  service.status = status;
  saveServices(services);

  return res.status(200).json({
    message: "Status updated successfully",
    service,
  });
});

const deployService = asyncHandler(async (req, res) => {
  const services = loadServices();
  const service = services.find((s) => s.id === req.params.id);

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  const target = resolveTarget(service.target);

  service.status = "building";
  service.lastDeploymentStartedAt = new Date().toISOString();
  service.lastDeploymentFinishedAt = null;
  service.deploymentError = null;
  // Recorded before the handler runs, not after it succeeds. A deployment
  // that fails partway can still leave a container or task behind, and the
  // cleanup path needs to know which handler owns it.
  service.deployedTarget = target;

  saveServices(services);

  const { start } = getHandlersForTarget(target);

  start({ ...service });

  return res.status(202).json({
    message: "Deployment started",
    service,
  });
});

const redeployService = asyncHandler(async (req, res) => {
  const services = loadServices();
  const service = services.find((s) => s.id === req.params.id);

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  const target = resolveTarget(service.target);

  service.status = "building";
  service.lastDeploymentStartedAt = new Date().toISOString();
  service.lastDeploymentFinishedAt = null;
  service.deploymentError = null;
  service.deployedTarget = target;

  saveServices(services);

  const { start } = getHandlersForTarget(target);

  start({ ...service });

  return res.status(202).json({
    message: "Redeployment started",
    service,
  });
});

const stopService = asyncHandler(async (req, res) => {
  const services = loadServices();
  const service = services.find((s) => s.id === req.params.id);

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  if (service.status !== "deployed") {
    throw new AppError("Only deployed services can be undeployed", 400);
  }

  // Stop what was started, not what the service currently points at.
  const { stop } = getHandlersForTarget(getDeployedTarget(service));

  const updatedService = await stop(service);

  return res.status(200).json({
    message: "Service undeployed successfully",
    service: updatedService,
  });
});

const deleteService = asyncHandler(async (req, res) => {
  const services = loadServices();
  const serviceIndex = services.findIndex((s) => s.id === req.params.id);

  if (serviceIndex === -1) {
    throw new AppError("Service not found", 404);
  }

  const serviceToDelete = services[serviceIndex];
  const { stop } = getHandlersForTarget(getDeployedTarget(serviceToDelete));

  const hasRunningWorkload =
    serviceToDelete.dockerContainerName ||
    serviceToDelete.taskArn ||
    serviceToDelete.status === "deployed";

  if (hasRunningWorkload) {
    await stop(serviceToDelete);
  }

  const latestServices = loadServices();
  const latestServiceIndex = latestServices.findIndex((s) => s.id === req.params.id);

  if (latestServiceIndex === -1) {
    throw new AppError("Service not found after cleanup", 404);
  }

  const deletedService = latestServices[latestServiceIndex];
  latestServices.splice(latestServiceIndex, 1);
  saveServices(latestServices);

  return res.status(200).json({
    message: "Service deleted successfully",
    service: deletedService,
  });
});

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  updateServiceStatus,
  deployService,
  redeployService,
  stopService,
  deleteService,
};
