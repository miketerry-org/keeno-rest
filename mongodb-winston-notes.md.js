// keeno-mongodb/index.js

const mongoose = require("mongoose");
const { transports } = require("winston");
const Log = require("./models/Log");

// Optional: Your connection string can be set from env or passed externally
const connectMongo = async uri => {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("[keeno-mongodb] Connected to MongoDB");
};

// Winston-compatible stream transport using Mongoose
const mongoTransport = new transports.Stream({
  stream: {
    write: async messageJson => {
      try {
        const logObj = JSON.parse(messageJson);
        await Log.create(logObj);
      } catch (err) {
        // fallback log to console if JSON parse or DB fails
        console.error("[MongoLogTransport]", err);
        console.error("[MongoLogFallback]", messageJson);
      }
    },
  },
});

// Export the logger adapter compatible with keeno-rest
const logger = {
  transport: mongoTransport,
};

module.exports = {
  logger,
  connectMongo,
  mongoose,
};
  models: { Log },
