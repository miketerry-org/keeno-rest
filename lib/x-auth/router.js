// auth_router.js:

load all necessary modules
const express = require("express");
const router = express.Router();

// POST /register
router.post("/register", (req, res) => {
  res.send("Register user");
});

// POST /login
router.post("/login", (req, res) => {
  res.send("Login user");
});

// GET /me (protected later with JWT)
router.get("/me", (req, res) => {
  res.send("User info");
});

// POST /forgot-password
router.post("/forgot-password", (req, res) => {
  res.send("Start password reset");
});

// POST /reset-password
router.post("/reset-password", (req, res) => {
  res.send("Reset password");
});

module.exports = router;
