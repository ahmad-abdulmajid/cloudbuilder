const fs = require("fs");
const path = require("path");

const dataFilePath = path.join(__dirname, "..", "data", "services.json");

const loadServices = () => {
  try {
    const data = fs.readFileSync(dataFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const saveServices = (services) => {
  fs.writeFileSync(dataFilePath, JSON.stringify(services, null, 2));
};

const pushDeploymentHistory = (serviceId, record) => {
  const services = loadServices();
  const service = services.find((s) => s.id === serviceId);

  if (!service) {
    return null;
  }

  if (!Array.isArray(service.deploymentHistory)) {
    service.deploymentHistory = [];
  }

  service.deploymentHistory.push(record);
  saveServices(services);

  return record;
};

const updateDeploymentHistoryEntry = (serviceId, recordId, updates) => {
  const services = loadServices();
  const service = services.find((s) => s.id === serviceId);

  if (!service || !Array.isArray(service.deploymentHistory)) {
    return null;
  }

  const entry = service.deploymentHistory.find((r) => r.id === recordId);

  if (!entry) {
    return null;
  }

  Object.assign(entry, updates);
  saveServices(services);

  return entry;
};

module.exports = {
  loadServices,
  saveServices,
  pushDeploymentHistory,
  updateDeploymentHistoryEntry,
};