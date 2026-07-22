const express = require("express");
const {
  createService,
  getAllServices,
  getServiceById,
  updateServiceStatus,
  deployService,
  redeployService,
  stopService,
  deleteService,
} = require("../controllers/serviceController");

const router = express.Router();

router.post("/", createService);
router.get("/", getAllServices);
router.post("/:id/deploy", deployService);
router.post("/:id/redeploy", redeployService);
router.post("/:id/stop", stopService);
router.get("/:id", getServiceById);
router.patch("/:id/status", updateServiceStatus);
router.delete("/:id", deleteService);

module.exports = router;