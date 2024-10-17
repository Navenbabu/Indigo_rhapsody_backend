const mongoose = require("mongoose");
const fetch = require("node-fetch");
const Orders = require("../models/orderModel");

const SHIP_API_URL =
  "https://indigorhapsodyserver.vercel.app/orders/create/adhoc";

// Function to send the shipping creation request
exports.ship = async (req, res) => {
  try {
    const {
      orderId,
      authToken,
      length,
      pickup_Location,
      breadth,
      height,
      weight,
    } = req.body; // Get dimensions and weight

    if (!orderId || !authToken) {
      return res
        .status(400)
        .json({ message: "orderId and authToken are required." });
    }

    // Fetch the order details along with product information
    const order = await Orders.findOne({ orderId })
      .populate({
        path: "products.productId",
        select: "productName sku", // Fetch only the name and SKU fields
      })
      .populate("userId");

    console.log(order);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Prepare the request body for the shipping API
    const requestBody = {
      order_id: order.orderId,
      order_date: order.orderDate.toISOString(),
      pickup_location: pickup_Location || "Default Location",
      comment: "Order shipping initiated.",
      billing_customer_name: order.userId.displayName || "N/A",
      billing_last_name: "LastName", // Optional field
      billing_address: order.shippingDetails?.address?.street || "N/A",
      billing_address_2: "Address Line 2",
      billing_city: order.shippingDetails?.address?.city || "N/A",
      billing_pincode: order.shippingDetails?.address?.postalCode || "000000",
      billing_state: order.shippingDetails?.address?.state || "N/A",
      billing_country: order.shippingDetails?.address?.country || "N/A",
      billing_email: order.userId.email || "example@example.com",
      billing_phone: "+919560360744", // Replace with actual phone number
      shipping_is_billing: true,
      order_items: order.products.map((product) => ({
        name: product.productId.productName, // Get product name from populated productId
        sku: product.productId.sku, // Get SKU from populated productId
        units: product.quantity,
        selling_price: product.price,
      })),
      payment_method: order.paymentMethod,
      total_discount: order.discountAmount || 0,
      sub_total: order.amount,
      length: length || 10, // Use the provided length or default to 10
      breadth: breadth || 5, // Use the provided breadth or default to 5
      height: height || 8, // Use the provided height or default to 8
      weight: weight || 1.5, // Use the provided weight or default to 1.5
    };

    // Log the payload for debugging
    console.log(
      "Payload being sent to Shiprocket API:",
      JSON.stringify(requestBody, null, 2)
    );

    // Send the request to the external shipping API
    const response = await fetch(SHIP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`, // Use the authToken from the request body
      },
      body: JSON.stringify(requestBody),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      console.error("Failed to create shipping:", responseBody);
      return res.status(response.status).json({
        error: responseBody.message || "Failed to create shipping order",
      });
    }

    order.shipmentId = responseBody.shipment_id; // Save shipment_id from the response
    await order.save();

    res.status(200).json({
      message: "Shipping order created successfully",
      data: responseBody,
    });
  } catch (error) {
    console.error("Error creating shipping order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Handle incoming webhook responses from Shiprocket
exports.ShippingWebhook = async (req, res) => {
  try {
    console.log("Received webhook:", req.body);

    res.status(200).json({ message: "Webhook received and processed" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
