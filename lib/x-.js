function createDefaultLogger(dbConnection) {
  const transports = [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ];

  // Add DB transport if a dbConnection is provided (pseudo-implementation)
  if (dbConnection && typeof dbConnection.log === "function") {
    // Simulate a basic DB transport
    const dbTransport = new winston.transports.Stream({
      stream: {
        write: message => dbConnection.log(message),
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
