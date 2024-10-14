const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  createdTime: {
    type: Date,
    default: Date.now,
  },
  phoneNumber: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["Designer", "User", "Admin"],
    default: "User",
  },
  is_creator: {
    type: Boolean,
    default: false,
  },
  address: {
    type: String,
    required: true,
  },
  pincode: {
    type: Number,
    required: true,
  },
  last_logged_in: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
