const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const requireAuth = require("./middleware/requireAuth");
const errorHandler = require("./middleware/errorHandler");

const app = express();

const FRONTEND_DIST = path.join(__dirname, "..", "..", "frontend", "dist");

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "cloudbuilder-backend"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/services", requireAuth, serviceRoutes);

app.use(express.static(FRONTEND_DIST));

app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

app.use(errorHandler);

module.exports = app;