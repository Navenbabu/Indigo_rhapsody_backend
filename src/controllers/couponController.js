const Coupon = require("../models/couponsModel");
const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const {
  validateCoupon,
  hasUserUsedCoupon,
  markCouponAsUsed,
} = require("../utils/couponUtils");

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

// Create a new coupon
exports.createCoupon = async (req, res) => {
  try {
    const { couponCode, couponAmount, expiryDate } = req.body;
    const coupon = new Coupon({
      couponCode,
      couponAmount,
      expiryDate,
    });

    const savedCoupon = await coupon.save();
    res.status(201).json(savedCoupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an existing coupon by ID
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCoupon = await Coupon.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json(updatedCoupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a coupon by ID
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific coupon by code
exports.getCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    const coupon = await Coupon.findOne({ couponCode: code });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getAllCoupons = async (req, res) => {
  try {
    // Fetch all coupons from the database
    const coupons = await Coupon.find();

    // Check if coupons exist
    if (!coupons.length) {
      return res.status(404).json({ message: "No coupons found" });
    }

    // Respond with the fetched coupons
    res.status(200).json({
      message: "Coupons fetched successfully",
      data: coupons,
    });
  } catch (error) {
    // Handle errors and respond with an error message
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      message: "Error fetching coupons",
      error: error.message,
    });
  }
};

// Get a coupon by ID
exports.getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get coupons by user (optional logic if you want user-specific filtering)
exports.getCouponsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const coupons = await Coupon.find({ userId });

    if (!coupons.length) {
      return res
        .status(404)
        .json({ message: "No coupons found for this user" });
    }

    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const { userId, couponCode } = req.body;

    // Find the coupon by code
    const coupon = await Coupon.findOne({ couponCode });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    // Check if the coupon is still active and not expired
    if (!coupon.is_active || coupon.expiryDate < new Date()) {
      return res.status(400).json({ message: "Coupon is expired or inactive" });
    }

    // Check if the user has already used this coupon
    if (coupon.usedBy.includes(userId)) {
      return res.status(403).json({
        message: "You have already used this coupon",
      });
    }

    coupon.usedBy.push(userId); // Add user to usedBy list
    await coupon.save();

    res.status(200).json({
      message: "Coupon applied successfully",
      discount: coupon.couponAmount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.applyCouponToCart = async (req, res) => {
  try {
    const { cartId, couponId, userId } = req.body; // Changed from couponCode to couponId

    // Validate the coupon by ID
    const coupon = await Coupon.findById(couponId); // Fetch coupon using couponId
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" }); // Handle coupon not found case
    }

    console.log("Coupon Validated:", coupon);

    // Check if the user has already used this coupon
    const used = hasUserUsedCoupon(coupon, userId);
    if (used) {
      return res
        .status(403)
        .json({ message: "You have already used this coupon" });
    }

    // Find the cart by ID
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Check if a discount is already applied to the cart
    if (cart.discount_applied) {
      return res
        .status(400)
        .json({ message: "A coupon is already applied to this cart" });
    }

    // Calculate new totals
    const subtotal = cart.products.reduce(
      (sum, product) => sum + product.price * product.quantity,
      0
    );
    const discountAmount = coupon.couponAmount;
    const totalAmount =
      subtotal - discountAmount + cart.shipping_cost + cart.tax_amount;

    // Update cart details
    cart.subtotal = roundToTwoDecimals(subtotal);
    cart.discount_applied = true;
    cart.discount_amount = roundToTwoDecimals(discountAmount);
    cart.total_amount = roundToTwoDecimals(totalAmount);

    // Save the cart
    await cart.save();

    // Mark the coupon as used by this user
    await markCouponAsUsed(coupon, userId);
    console.log("Coupon marked as used for user:", userId);

    res.status(200).json({
      message: "Coupon applied successfully",
      cart,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({ error: error.message });
  }
};
