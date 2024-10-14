const mongoose = require("mongoose");

const videoModel = {
  videoUrl: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  comments: [
    {
      type: String,
    },
  ],
  likes: {
    type: Number,
    default: 0,
  },
  is_approved: {
    type: Boolean,
    default: false,
  },
};

module.exports = mongoose.model("Video", videoModel);
