"use strict";

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const hpp = require("hpp");
const system = require("keeno-system");
const { server } = require("keeno-config");
const winston = require("winston");

// Async handler wrapper for clean async error handling
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Logger factory with optional DB connection transport
function createDefaultLogger(dbConnection) {
  const transports = [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ];

  // Optional: plug in a custom DB log transport
  if (dbConnection && typeof dbConnection.log === "function") {
    const dbTransport = new winston.transports.Stream({
      stream: {
        write: message => dbConnection.log(message.trim()),
      },
    });
    transports.push(dbTransport);
  }

  return winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports,
  });
}

function restAPI(options = {}) {
  const app = express();
  app.set("trust proxy", 1);

  // Body parsers with size limit
  const bodyLimit = options.bodyLimit || "10kb";
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Security middlewares
  app.use(helmet());
  app.use(xss());
  app.use(hpp());

  // CORS config
  app.use(cors(options.cors || {}));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: (server.rate_limit_minutes || 15) * 60 * 1000,
    max: server.rate_limit_requests || 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Logging
  if (system.isDevelopment) {
    app.use(morgan("dev"));
  }

  // Logger setup (console or pluggable with DB)
  const logger = options.logger || createDefaultLogger(options.dbConnection);

  // Inject custom middlewares
  if (Array.isArray(options.middlewares)) {
    options.middlewares.forEach(middleware => {
      app.use(middleware);
    });
  }

  // Healthcheck endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // Register routes
  if (Array.isArray(options.routes)) {
    options.routes.forEach(({ path, router }) => {
      app.use(path, router);
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

  return { app, asyncHandler };
}

module.exports = restAPI;
