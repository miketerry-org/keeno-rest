// user/controller.js

"use strict";

// Load configuration and modules
const { server } = require("keeno-config");
const jwt = require("jsonwebtoken");
const getUserModel = require("./model");

// Utility function to sign a JWT for the given user ID
const signToken = id => {
  return jwt.sign({ id }, server.jwt_secret, {
    expiresIn: server.jwt_expires_in || "1h",
  });
};

// ===============================================
// @route   POST /register
// @desc    Register a new user
// @access  Public
// ===============================================
exports.register = async (req, res) => {
  // Get the tenant-specific User model
  const User = getUserModel(req.tenant.db);
  const { email, password } = req.body;

  // Basic input validation
  if (!email || !password || password.length < 12) {
    return res
      .status(400)
      .json({ message: "Email and 12+ character password are required" });
  }

  try {
    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Create the new user (password is hashed in model)
    const user = await User.create({ email, password });

    // Generate JWT for the new user
    const token = signToken(user._id);
    res.status(201).json({ token });
  } catch (err) {
    req.tenant.log.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
};

// ===============================================
// @route   POST /login
// @desc    Authenticate user and return JWT
// @access  Public
// ===============================================
exports.login = async (req, res) => {
  const User = getUserModel(req.tenant.db);
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    // Find user by email and include password field
    const user = await User.findOne({ email }).select("+password");

    // If user not found or account is locked
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isLocked) {
      return res.status(403).json({ message: "Account is locked" });
    }

    // Compare entered password with hashed password in DB
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Sign and return a JWT
    const token = signToken(user._id);
    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};

// ===============================================
// @route   GET /me
// @desc    Return current logged-in user's profile
// @access  Private (JWT required)
// ===============================================
exports.getMe = async (req, res) => {
  const User = getUserModel(req.tenant.db);

  try {
    // Find user by ID from JWT and exclude password
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user profile
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user info" });
  }
};

// ===============================================
// @route   POST /forgot-password
// @desc    Trigger password reset email (to be implemented)
// @access  Public
// ===============================================
exports.forgotPassword = async (req, res) => {
  // Placeholder response
  res
    .status(200)
    .json({ message: "Password reset process started (not implemented)" });
};

// ===============================================
// @route   POST /reset-password
// @desc    Handle password reset using token (to be implemented)
// @access  Public
// ===============================================
exports.resetPassword = async (req, res) => {
  // Placeholder response
  res.status(200).json({ message: "Password reset logic not implemented" });
};
