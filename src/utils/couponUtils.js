const Coupon = require("../models/couponsModel");

// Utility to validate coupon
exports.validateCoupon = async (couponCode) => {
  const coupon = await Coupon.findOne({ couponCode });

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  if (!coupon.is_active || coupon.expiryDate < new Date()) {
    throw new Error("Coupon is expired or inactive");
  }

  return coupon;
};

// Utility to check if the user has already used the coupon
exports.hasUserUsedCoupon = (coupon, userId) => {
  return coupon.usedBy.includes(userId);
};

// Utility to mark coupon as used by the user
exports.markCouponAsUsed = async (coupon, userId) => {
  coupon.usedBy.push(userId);
  await coupon.save();
};
