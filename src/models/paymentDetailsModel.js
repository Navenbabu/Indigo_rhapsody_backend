const mongoose = require("mongoose");

const paymentDetailsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  paymentDetails: {
    type: String,
    // required: true,
  },
  cartId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cart",
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  paymentStatus: {
    type: String,
    default: "Pending",
  },
  paymentId: {
    type: String,
    // required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("PaymentDetails", paymentDetailsSchema);
