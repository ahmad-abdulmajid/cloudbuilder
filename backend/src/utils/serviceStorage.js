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

module.exports = {
  loadServices,
  saveServices,
};