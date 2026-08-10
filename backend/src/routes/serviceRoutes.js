const express = require("express");
const {
  createService,
  getAllServices,
  getServiceById,
  updateServiceStatus,
  renameService,
  deployService,
  redeployService,
  stopService,
  deleteService,
  getServiceLogs,
} = require("../controllers/serviceController");

const router = express.Router();

router.post("/", createService);
router.get("/", getAllServices);
router.post("/:id/deploy", deployService);
router.post("/:id/redeploy", redeployService);
router.post("/:id/stop", stopService);
router.get("/:id/logs", getServiceLogs);
router.get("/:id", getServiceById);
router.patch("/:id/status", updateServiceStatus);
router.patch("/:id/rename", renameService);
router.delete("/:id", deleteService);

module.exports = router;