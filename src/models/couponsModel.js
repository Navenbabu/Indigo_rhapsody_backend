const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  couponCode: {
    type: String,
    required: true,
    unique: true, // Ensure uniqueness of coupon codes
  },
  couponAmount: {
    type: Number,
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  usedBy: [
    {
      type: mongoose.Schema.Types.ObjectId, // Store User IDs
      ref: "User",
    },
  ], // Track users who have used the coupon
});

// Middleware to deactivate expired coupons before saving
couponSchema.pre("save", function (next) {
  const currentDate = new Date();
  if (this.expiryDate < currentDate) {
    this.is_active = false;
  }
  next();
});

// Middleware to deactivate expired coupons during query
couponSchema.pre("find", function () {
  const currentDate = new Date();
  this.updateMany(
    { expiryDate: { $lt: currentDate }, is_active: true },
    { $set: { is_active: false } }
  );
});

couponSchema.pre("findOne", function () {
  const currentDate = new Date();
  this.updateMany(
    { expiryDate: { $lt: currentDate }, is_active: true },
    { $set: { is_active: false } }
  );
});

// Add a method to check if the coupon is active
couponSchema.methods.isActive = function () {
  const currentDate = new Date();
  return this.is_active && this.expiryDate > currentDate;
};

module.exports = mongoose.model("Coupon", couponSchema);
