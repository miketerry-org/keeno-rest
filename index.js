// index.js:

"use strict";

// load all necessary modules
const createAPIServer = require("./lib/createAPIServer");
const asyncHandler = require("./lib/asyncHandler");

module.exports = { createAPIServer, asyncHandler };
