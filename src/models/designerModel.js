const mongoose = require("mongoose");

const designerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  logoUrl: {
    type: String,
    required: true,
  },
  backGroundImage: {
    type: String,
    required: true,
  },
  is_approved: {
    type: Boolean,
    default: false,
  },
  shortDescription: {
    type: String,
  },
  about: {
    type: String,
  },
  createdTime: {
    type: Date,
    default: Date.now,
  },
  updatedTime: {
    type: Date,
    default: Date.now,
  },
});

exports = module.exports = mongoose.model("Designer", designerSchema);
