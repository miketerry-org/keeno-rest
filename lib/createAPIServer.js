// createAPIServer.js:

"use strict";

// Load all necessary modules
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const system = require("keeno-system");
const Schema = require("keeno-schema");

// Destructure required data types
const { Boolean, integer, string } = Schema.types;

// Default logger fallback (native console)
function createDefaultLog(config) {
  return console;
}

function createAPIServer(config, options = {}) {
  // Validate environment configuration
  const { validated, errors } = new Schema({
    port: integer({ min: 1, max: 65000, required: true }),
    db_url: string({ minLength: 1, maxLength: 255, required: true }),
    log_collection_name: string({
      minLength: 1,
      maxLength: 255,
      required: true,
    }),
    log_expiration_days: integer({ min: 1, max: 365, required: false }),
    log_capped: Boolean({ required: false }),
    log_max_size: integer({ min: 0, max: 1000, required: false }),
    log_max_docs: integer({ min: 0, max: 1000000, required: false }),
    rate_limit_minutes: integer({ min: 1, max: 60 * 60, required: true }),
    rate_limit_requests: integer({ min: 1, max: 10000, required: true }),
    body_limit: string({ required: false }),
  }).validate(config);

  // ensure no configuration errors
  if (errors.length > 0) {
    throw new Error(errors.map(err => err.message).join(", "));
  }

  // Initialize the express application
  const app = express();
  app.set("trust proxy", 1);

  // Body parsers with size limit
  const bodyLimit = validated.body_limit || "10kb";
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Security middlewares
  app.use(helmet());
  app.use(hpp());
  app.use(cors(options.cors || {}));

  // Rate limiting middleware
  const limiter = rateLimit({
    windowMs: validated.rate_limit_minutes * 60 * 1000,
    max: validated.rate_limit_requests,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Development logging
  if (system.isDevelopment) {
    app.use(morgan("dev"));
  }

  // Logger setup
  const logger =
    typeof options.logger === "object"
      ? options.logger
      : createDefaultLog(config);

  // Attach logger to each request
  app.use((req, res, next) => {
    req.log = logger;
    next();
  });

  // Custom middlewares
  if (Array.isArray(options.middlewares)) {
    options.middlewares.forEach(middleware => {
      app.use(middleware);
    });
  }

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // Custom routes
  if (Array.isArray(options.routes)) {
    options.routes.forEach(({ path, router }) => {
      app.use(path, router);
    });
  }

  // Versioned API routes
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
    if (!err) return next();
    req.log.error(err.stack || err.message);
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

  return app;
}

module.exports = createAPIServer;
