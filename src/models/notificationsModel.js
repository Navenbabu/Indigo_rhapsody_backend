const mongoose = require("mongoose");

const notificationsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  designeref: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Designer",
    // required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  title: {
    type: String,
  },
  seen: {
    type: Boolean,
    default: false,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  returnId: {
    type: String,
  },
});

module.exports = mongoose.model("Notifications", notificationsSchema);
