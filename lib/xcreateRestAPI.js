// createRestAPI.js:

"use strict";

// load all necessarymodules
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const system = require("keeno-system");
const { loadEnvFile } = require("keeno-env");
const validConfig = require("./validConfig.js");

function createRestAPI(config, options = {}) {
  let { validated, errors } = validConfig(config);
  // initialize the express application
  const app = express();

  // turn proxy trust on
  app.set("trust proxy", 1);

  // Body parsers with size limit
  app.use(express.json({ limit: config.bodyLimit || "10kb" }));
  app.use(
    express.urlencoded({ extended: true, limit: config.bodyLimit || "10kb" })
  );

  // Security
  app.use(helmet());
  app.use(hpp());
  app.use(cors(options.cors || {}));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: (config.rate_limit_minutes || 15) * 60 * 1000,
    max: config.rate_limit_requests || 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Development logging
  if (system.isDevelopment) {
    app.use(morgan("dev"));
  }

  // Pluggable custom logger (e.g., Winston with DB transport)
  const logger = options.logger || createDefaultLogger(options.dbConnection);

  // Custom middlewares (including DB-specific sanitization)
  if (Array.isArray(options.middlewares)) {
    options.middlewares.forEach(middleware => {
      app.use(middleware);
    });
  }

  // Healthcheck endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // Route injection
  if (Array.isArray(options.routes)) {
    options.routes.forEach(({ path, router }) => {
      app.use(path, router);
    });
  }

  // Versioned route injection
  if (Array.isArray(options.versions)) {
    options.versions.forEach(({ version, router }) => {
      app.use(`/api/${version}`, router);
    });
  }

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ success: false, error: "Not Found" });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    logger.error(err.stack || err.message);
    const message = system.isDevelopment ? err.message : "Server Error";
    res.status(err.status || 500).json({ success: false, error: message });
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info("Shutting down gracefully...");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Return createRestAPI + asyncHandler in case routes want to use it
  return app;
}

module.exports = createRestAPI;
