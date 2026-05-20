const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/services", serviceRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "cloudbuilder-backend"
  });
});

module.exports = app;
