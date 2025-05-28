// auth/model.js:

"use strict";

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const AuthSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [12, "Password must be at least 12 characters"],
      select: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

AuthSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

AuthSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get or create the Auth model on a tenant-specific Mongoose connection.
 * @param {mongoose.Connection} db - A Mongoose connection from req.tenant.db
 * @returns {mongoose.Model} - The Auth model bound to this connection
 */
module.exports = function getAuthModel(db) {
  return db.models.Auth || db.model("Auth", AuthSchema);
};
