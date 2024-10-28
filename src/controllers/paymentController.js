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

// 4. Payment Webhook (PhonePe)// 4. Payment Webhook (PhonePe)
// 4. Payment Webhook (PhonePe)
exports.paymentWebhook = async (req, res) => {
  try {
    let responseString;

    // Parse the raw body based on content type
    if (req.body && req.body.response) {
      responseString = req.body.response; // Handle normal JSON payload
    } else if (req.rawBody) {
      const contentType = req.headers["content-type"];
      if (contentType.includes("application/json")) {
        const parsedBody = JSON.parse(req.rawBody);
        responseString = parsedBody.response;
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const parsedBody = new URLSearchParams(req.rawBody);
        responseString = parsedBody.get("response");
      } else {
        return res.status(400).send("Unsupported content type");
      }
    } else {
      return res.status(400).send("No request body");
    }

    if (!responseString) {
      return res.status(400).send("Missing response data");
    }

    // Decode base64-encoded response if necessary
    let decodedData;
    try {
      decodedData = Buffer.from(responseString, "base64").toString("utf-8");
    } catch (error) {
      return res.status(400).json({ message: "Failed to decode base64 data" });
    }

    let paymentData;
    try {
      paymentData = JSON.parse(decodedData);
    } catch (error) {
      return res.status(400).json({ message: "Invalid JSON in decoded data" });
    }

    const transactionId = paymentData.data.transactionId;
    const status = paymentData.data.paymentState;
    const amount = paymentData.data.amount;
    const payResponseCode = paymentData.data.payResponseCode;

    if (!transactionId || !status || !payResponseCode) {
      return res.status(400).send("Invalid payment data");
    }

    // Log payment details for debugging
    console.log("Payment Status:", status);
    console.log("Transaction ID:", transactionId);
    console.log("Response Code:", payResponseCode);
    console.log("Amount:", amount);

    // Update payment status in the PaymentDetails collection using transactionId
    const payment = await PaymentDetails.findOneAndUpdate(
      { transactionId },
      {
        status: status === "COMPLETED" ? "Paid" : "Failed",
        paymentStatus: status === "COMPLETED" ? "Completed" : "Failed", // Update paymentStatus
        transactionId,
        amount, // Update the amount as well for tracking purposes
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // If payment is successful, trigger order creation
    if (status === "COMPLETED" && payResponseCode === "SUCCESS") {
      const orderRequest = {
        body: {
          userId: payment.userId,
          cartId: payment.cartId,
          paymentMethod: payment.paymentMethod,
          shippingDetails: payment.shippingDetails || {}, // Add shipping details if needed
          notes: req.body.notes || "", // Optional notes
        },
      };

      try {
        await createOrder(orderRequest, res); // Call the order creation logic
      } catch (error) {
        console.error("Error creating order:", error);
        return res.status(500).send("Error creating order");
      }
    }

    return res.status(200).send("Payment status updated successfully");
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).send("Error processing webhook");
  }
};
