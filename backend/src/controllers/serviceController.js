const { loadServices, saveServices } = require("../utils/serviceStorage");
const {
  startLocalDeployment,
  stopLocalDeployment,
} = require("../services/deploymentService");

function createService(req, res) {
  const { name, repoUrl, port } = req.body;

  const trimmedName = name?.trim();
  const trimmedRepoUrl = repoUrl?.trim();
  const numericPort = Number(port);

  if (!trimmedName || !trimmedRepoUrl || !port) {
    return res.status(400).json({ message: "Name, repo URL, and port are required" });
  }

  const githubUrlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/;

  if (!githubUrlPattern.test(trimmedRepoUrl)) {
    return res.status(400).json({ message: "Repo URL must be a valid GitHub repository link" });
  }

  if (isNaN(numericPort) || numericPort < 1 || numericPort > 65535) {
    return res.status(400).json({ message: "Port must be a number between 1 and 65535" });
  }

  const services = loadServices();

  const duplicateName = services.find(
    (service) => service.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (duplicateName) {
    return res.status(409).json({ message: "A service with this name already exists" });
  }

  const duplicateRepo = services.find(
    (service) => service.repoUrl.toLowerCase() === trimmedRepoUrl.toLowerCase()
  );

  if (duplicateRepo) {
    return res.status(409).json({ message: "A service with this repository URL already exists" });
  }

  const newService = {
    id: Date.now().toString(),
    name: trimmedName,
    repoUrl: trimmedRepoUrl,
    port: numericPort,
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
  };

  services.push(newService);
  saveServices(services);

  return res.status(201).json(newService);
}

function getAllServices(req, res) {
  const services = loadServices();
  return res.status(200).json(services);
}

function getServiceById(req, res) {
  const services = loadServices();
  const service = services.find((s) => s.id === req.params.id);

  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  return res.status(200).json(service);
}

function updateServiceStatus(req, res) {
  const { status } = req.body;
  const allowedStatuses = ["created", "building", "pushed", "deployed", "failed"];

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  const services = loadServices();
  const service = services.find((s) => s.id === req.params.id);

  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  service.status = status;
  saveServices(services);

  return res.status(200).json({
    message: "Status updated successfully",
    service,
  });
}

function deployService(req, res) {
  const services = loadServices();
  const service = services.find((s) => s.id === req.params.id);

  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  service.status = "building";
  service.lastDeploymentStartedAt = new Date().toISOString();
  service.lastDeploymentFinishedAt = null;
  service.deploymentError = null;

  saveServices(services);

  startLocalDeployment({ ...service });

  return res.status(202).json({
    message: "Deployment started",
    service,
  });
}

async function stopService(req, res) {
  const services = loadServices();
  const service = services.find((s) => s.id === req.params.id);

  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  if (service.status !== "deployed") {
    return res.status(400).json({
      message: "Only deployed services can be undeployed",
    });
  }

  const updatedService = await stopLocalDeployment(service);

  return res.status(200).json({
    message: "Service undeployed successfully",
    service: updatedService,
  });
}

async function deleteService(req, res) {
  const services = loadServices();
  const serviceIndex = services.findIndex((s) => s.id === req.params.id);

  if (serviceIndex === -1) {
    return res.status(404).json({ message: "Service not found" });
  }

  const serviceToDelete = services[serviceIndex];

  if (serviceToDelete.dockerContainerName || serviceToDelete.status === "deployed") {
    await stopLocalDeployment(serviceToDelete);
  }

  const latestServices = loadServices();
  const latestServiceIndex = latestServices.findIndex((s) => s.id === req.params.id);

  if (latestServiceIndex === -1) {
    return res.status(404).json({ message: "Service not found after cleanup" });
  }

  const deletedService = latestServices[latestServiceIndex];
  latestServices.splice(latestServiceIndex, 1);
  saveServices(latestServices);

  return res.status(200).json({
    message: "Service deleted successfully",
    service: deletedService,
  });
}

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  updateServiceStatus,
  deployService,
  stopService,
  deleteService,
};