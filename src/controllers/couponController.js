const Coupon = require("../models/couponsModel");
const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const {
  validateCoupon,
  hasUserUsedCoupon,
  markCouponAsUsed,
} = require("../utils/couponUtils");

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
    // Get the current date and time
    const currentDate = new Date();

    // Fetch coupons where expiryDate is greater than the current date and time
    const coupons = await Coupon.find({ expiryDate: { $gte: currentDate } });

    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getAllCouponsAll = async (req, res) => {
  try {
    // Fetch all coupons from the database
    const coupons = await Coupon.find();

    // Respond with the fetched coupons
    res.status(200).json({
      message: "Coupons fetched successfully",
      data: coupons,
    });
  } catch (error) {
    // Handle errors and respond with an error message
    res.status(500).json({
      message: "Error fetching coupons",
      error: error.message,
    });
  }
};

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

    // If not used, allow the coupon to be applied
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
    const { cartId, couponCode, userId } = req.body;

    // Validate the coupon
    const coupon = await validateCoupon(couponCode);

    // Check if the user has already used this coupon
    if (hasUserUsedCoupon(coupon, userId)) {
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
    const subtotal = cart.products.reduce((sum, product) => {
      return sum + product.price * product.quantity;
    }, 0);

    const discountAmount = coupon.couponAmount;
    const totalAmount =
      subtotal - discountAmount + cart.shipping_cost + cart.tax_amount;

    cart.subtotal = subtotal;
    cart.discount_applied = true;
    cart.discount_amount = discountAmount;
    cart.total_amount = totalAmount;

    await cart.save();

    // Mark the coupon as used by this user
    await markCouponAsUsed(coupon, userId);

    res.status(200).json({
      message: "Coupon applied successfully",
      cart,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
