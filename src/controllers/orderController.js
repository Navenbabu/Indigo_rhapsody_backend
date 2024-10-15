const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Product = require("../models/productModels");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");

// 1. Create an Order
exports.createOrder = async (req, res) => {
  try {
    const { userId, cartId, paymentMethod, shippingDetails, notes } = req.body;

    // Find the user's cart by cartId
    const cart = await Cart.findOne({ _id: cartId, userId }).populate(
      "products.productId"
    );
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Calculate total amount and prepare order details from cart
    let totalAmount = 0;
    const orderProducts = cart.products.map((item) => {
      const product = item.productId;

      // Check if variants exist and find the specific variant for color
      const variant = product.variants
        ? product.variants.find((v) => v.color === item.color)
        : null;

      if (!variant) {
        throw new Error(
          `Variant for color '${item.color}' not found for product '${product.productName}'`
        );
      }

      // Check if sizes exist within the variant
      const sizeVariant = variant.sizes
        ? variant.sizes.find((s) => s.size === item.size)
        : null;

      if (!sizeVariant) {
        throw new Error(
          `Size '${item.size}' not found for product '${product.productName}' with color '${item.color}'`
        );
      }

      const price = sizeVariant.price;
      totalAmount += price * item.quantity;

      return {
        productId: item.productId._id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: price,
        discount: item.discount || 0,
      };
    });

    // Create the order
    const order = new Order({
      userId,
      amount: totalAmount,
      cartId: cart._id, // Store the cartId for reference
      products: orderProducts,
      paymentMethod,
      shippingDetails,
      notes,
      orderId: `ORD-${Date.now()}`,
    });

    // Save the order
    await order.save();

    // Clear the user's cart after order creation
    cart.products = [];
    await cart.save();

    return res
      .status(201)
      .json({ message: "Order created successfully", order });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error creating order", error: error.message });
  }
};

// 2. Get Orders by User (User's Order History)
exports.getOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all orders for the user
    const orders = await Order.find({ userId }).populate({
      path: "products.productId",
      select: "productName",
    });

    if (!orders.length)
      return res.status(404).json({ message: "No orders found" });

    return res.status(200).json({ orders });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching orders", error });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, shippingDetails, paymentStatus } = req.body;

    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        status,
        paymentStatus,
        shippingDetails,
        [`statusTimestamps.${status.toLowerCase()}`]: Date.now(),
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    return res
      .status(200)
      .json({ message: "Order updated successfully", order });
  } catch (error) {
    return res.status(500).json({ message: "Error updating order", error });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "products.productId",
        select: "productName",
      })
      .populate({
        path: "userId",
        select: "name email",
      });

    if (!orders.length)
      return res.status(404).json({ message: "No orders found" });

    return res.status(200).json({ orders });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching all orders", error });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, shippingDetails, paymentStatus } = req.body;

    // Find and update the order
    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        status,
        paymentStatus,
        shippingDetails,
        [`statusTimestamps.${status.toLowerCase()}`]: Date.now(),
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    return res
      .status(200)
      .json({ message: "Order updated successfully", order });
  } catch (error) {
    return res.status(500).json({ message: "Error updating order", error });
  }
};
