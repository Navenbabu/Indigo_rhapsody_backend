const mongoose = require("mongoose");
const crypto = require("crypto");
const Order = require("../models/orderModel");
const PaymentDetails = require("../models/paymentDetailsModel");
const { createOrder } = require("./orderController"); // Import your order controller

// 1. Create a Payment
// 1. Create a Payment
function generateTransactionId() {
  return crypto.randomBytes(16).toString("hex"); // Generates a 32-character hexadecimal string
}
exports.createPaymentDetails = async (req, res) => {
  try {
    const { userId, cartId, paymentId, paymentMethod, amount, paymentDetails } =
      req.body;

    // Validate required fields
    if (!userId || !cartId || !paymentMethod || !amount) {
      return res.status(400).json({
        message: "userId, cartId, paymentMethod, and amount are required",
      });
    }

    // Generate a new unique transaction ID
    const transactionId = generateTransactionId();

    // Check if the generated transactionId already exists
    const existingPayment = await PaymentDetails.findOne({ transactionId });
    if (existingPayment) {
      return res.status(400).json({
        message: "Duplicate transaction ID generated. Please try again.",
      });
    }

    // Create a new payment entry with all required fields
    const newPayment = new PaymentDetails({
      userId,
      cartId,
      paymentId,
      paymentMethod,
      transactionId, // New transaction ID
      amount, // New amount
      paymentDetails: paymentDetails || "", // Optional field
      paymentStatus: "Pending", // Initial payment status
    });

    // Save the payment details to the database
    const savedPayment = await newPayment.save();

    // Return the saved payment details in the response
    return res.status(201).json({
      message: "Payment details created successfully",
      payment: savedPayment, // Include the saved payment details in the response
    });
  } catch (error) {
    console.error("Error creating payment details:", error);
    return res.status(500).json({
      message: "Error creating payment details",
      error: error.message,
    });
  }
};
// 2. Get Payment Details
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const paymentDetails = await PaymentDetails.findById(paymentId);
    if (!paymentDetails)
      return res.status(404).json({ message: "Payment not found" });

    return res.status(200).json({ paymentDetails });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching payment details", error });
  }
};

// 3. Update Payment Details
exports.updatePaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, paymentMethod, amount } = req.body;

    const updatedPayment = await PaymentDetails.findByIdAndUpdate(
      paymentId,
      { status, paymentMethod, amount },
      { new: true }
    );

    if (!updatedPayment)
      return res.status(404).json({ message: "Payment not found" });

    return res.status(200).json({
      message: "Payment details updated successfully",
      updatedPayment,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating payment details", error });
  }
};
exports.paymentWebhook = async (req, res) => {
  try {
    console.log("Webhook triggered");

    // Parse raw request body or JSON content
    let responseString = req.body.response || req.rawBody;

    if (!responseString) {
      return res.status(400).send("Missing payment response data.");
    }

    // Decode base64-encoded response
    let decodedData;
    try {
      decodedData = Buffer.from(responseString, "base64").toString("utf-8");
      console.log("Decoded Data:", decodedData);
    } catch (error) {
      console.error("Base64 decode error:", error.message);
      return res.status(400).json({ message: "Failed to decode base64 data." });
    }

    // Parse JSON from the decoded data
    let paymentData;
    try {
      paymentData = JSON.parse(decodedData);
      console.log("Parsed Payment Data:", JSON.stringify(paymentData));
    } catch (error) {
      console.error("Invalid JSON in decoded data:", error.message);
      return res.status(400).json({ message: "Invalid JSON in decoded data." });
    }

    // Extract required fields with fallback for missing data
    const {
      merchantTransactionId,
      state,
      amount,
      paymentInstrument = {},
    } = paymentData.data || {};

    const paymentMethod = paymentInstrument.type || "Phonepe";

    if (!merchantTransactionId || !state || !amount) {
      console.error("Missing required payment data");
      return res.status(400).send("Invalid payment data.");
    }

    // Update payment details using merchantTransactionId (mapped to transactionId)
    const payment = await PaymentDetails.findOneAndUpdate(
      { transactionId: merchantTransactionId },
      {
        status: state === "COMPLETED" ? "Paid" : "Failed",
        paymentStatus: state === "COMPLETED" ? "Completed" : "Failed",
        amount,
        paymentMethod,
      },
      { new: true }
    );

    if (!payment) {
      console.error("Payment not found.");
      return res.status(404).json({ message: "Payment not found." });
    }

    console.log("Payment status updated:", payment);

    // Create an order regardless of payment status (for testing purposes)
    const orderRequest = {
      body: {
        userId: payment.userId,
        cartId: payment.cartId,
        paymentMethod: "Phonepe",
        shippingDetails: payment.shippingDetails || {},
        notes: req.body.notes || "",
        paymentStatus: state === "COMPLETED" ? "Completed" : "Failed", // Track the payment status in the order
      },
    };

    try {
      await createOrder(orderRequest, res);
      console.log("Order created successfully");
    } catch (error) {
      console.error("Error creating order:", error.message);
      return res.status(500).send("Error creating order.");
    }

    return res.status(200).send("Payment status updated and order created.");
  } catch (error) {
    console.error("Error processing webhook:", error.message);
    return res.status(500).send("Error processing webhook.");
  }
};
