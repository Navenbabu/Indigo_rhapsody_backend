const mongoose = require("mongoose");
const fetch = require("node-fetch");
const Orders = require("../models/orderModel");
const Shipping = require("../models/shippingModel"); // Import the Shipping model if needed

const SHIP_API_URL =
  "https://indigorhapsodyserver.vercel.app/orders/create/adhoc";
const INVOICE_API_URL =
  "https://indigorhapsodyserver-h9a3.vercel.app/manifests/generate";
const AUTH_API_URL = "https://indigorhapsodyserver-h9a3.vercel.app/auth/login";

const MANIFEST_API_URL =
  "https://indigorhapsodyserver-h9a3.vercel.app/courier/generate/label";

exports.ship = async (req, res) => {
  try {
    const { orderId, length, pickup_Location, breadth, height, weight } =
      req.body; // Get dimensions and weight

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required." });
    }

    // Fetch the access token with email and password in the body
    const authResponse = await fetch(AUTH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "rajatjiedm@gmail.com", // Replace with actual credentials
        password: "Raaxas12#", // Replace with actual credentials
      }),
    });

    const authBody = await authResponse.json();

    if (!authResponse.ok) {
      console.error("Failed to get access token:", authBody);
      return res.status(authResponse.status).json({
        error: authBody.message || "Failed to get access token",
      });
    }

    const authToken = authBody.token; // Extract the token from the response

    // Fetch the order details along with product information and designer reference
    const order = await Orders.findOne({ orderId })
      .populate({
        path: "products.productId",
        select: "productName sku designerRef", // Include designerRef
      })
      .populate("userId");

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
        name: product.productId.productName,
        sku: product.productId.sku,
        units: product.quantity,
        selling_price: product.price,
        productId: product.productId._id, // Include productId
        designerRef: product.productId.designerRef, // Include designerRef if available
      })),
      payment_method: order.paymentMethod,
      total_discount: order.discountAmount || 0,
      sub_total: order.amount,
      length: length || 10, // Use the provided length or default to 10
      breadth: breadth || 5, // Use the provided breadth or default to 5
      height: height || 8, // Use the provided height or default to 8
      weight: weight || 1.5, // Use the provided weight or default to 1.5
    };

    // Send the request to the external shipping API
    const response = await fetch(SHIP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`, // Use the fetched authToken
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

    // Extract and save the shipment details in the order
    const { shipment_id, status, order_id } = responseBody;

    // Create a new Shipping document (if using a separate collection)
    const shippingDoc = new Shipping({
      order_id: order_id,
      shipmentId: shipment_id,
      status: status,
      productDetails: order.products.map((product) => ({
        productId: product.productId._id,
        designerRef: product.productId.designerRef,
      })),
      invoiceUrl: "", // Placeholder for now
      order_date: order.orderDate,
      pickup_location: pickup_Location || "Default Location",
    });

    // Generate the invoice using shipment_id
    const invoiceRequestBody = {
      shipment_id: [shipment_id], // Pass shipment_id in an array
    };

    const invoiceResponse = await fetch(INVOICE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`, // Use the fetched authToken for authorization
      },
      body: JSON.stringify(invoiceRequestBody),
    });

    const invoiceBody = await invoiceResponse.json();

    if (!invoiceResponse.ok) {
      console.error("Failed to generate invoice:", invoiceBody);
      return res.status(invoiceResponse.status).json({
        error: invoiceBody.message || "Failed to generate invoice",
      });
    }

    // Save the invoice URL in the Shipping document
    shippingDoc.invoiceUrl = invoiceBody.invoice_url;
    await shippingDoc.save();

    // Optionally save the invoice URL in the order document
    order.invoiceUrl = invoiceBody.invoice_url;
    await order.save();

    res.status(200).json({
      message: "Shipping order created successfully",
      data: responseBody,
      invoiceUrl: invoiceBody.invoice_url, // Include the invoice URL in the response
    });
  } catch (error) {
    console.error("Error creating shipping order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const { shipment_id } = req.body;

    if (!shipment_id) {
      return res.status(400).json({ message: "shipment_id is required." });
    }

    // Fetch the access token with email and password in the body
    const authResponse = await fetch(AUTH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "rajatjiedm@gmail.com", // Replace with actual credentials
        password: "Raaxas12#", // Replace with actual credentials
      }),
    });

    const authBody = await authResponse.json();

    if (!authResponse.ok) {
      console.error("Failed to get access token:", authBody);
      return res.status(authResponse.status).json(authBody); // Return raw response body
    }

    const authToken = authBody.token; // Extract the token from the response

    // Generate the invoice using shipment_id
    const invoiceRequestBody = {
      shipment_id: [shipment_id], // Pass shipment_id in an array
    };

    const invoiceResponse = await fetch(INVOICE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`, // Use the fetched authToken for authorization
      },
      body: JSON.stringify(invoiceRequestBody),
    });

    const invoiceBody = await invoiceResponse.json();

    if (!invoiceResponse.ok) {
      console.error("Failed to generate invoice:", invoiceBody);
      return res.status(invoiceResponse.status).json(invoiceBody); // Return raw response body
    }

    // Update the Shipping document with the invoice URL
    const shippingDoc = await Shipping.findOneAndUpdate(
      { shipmentId: shipment_id },
      { invoiceUrl: invoiceBody.invoice_url },
      { new: true } // Return the updated document
    );

    if (!shippingDoc) {
      return res.status(404).json({ message: "Shipping document not found" });
    }

    res.status(200).json(invoiceBody); // Return raw response body
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

exports.generateManifest = async (req, res) => {
  try {
    const { shipment_id } = req.body;

    if (!shipment_id) {
      return res.status(400).json({ message: "shipment_id is required." });
    }

    // Fetch the access token with email and password in the body
    const authResponse = await fetch(AUTH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "rajatjiedm@gmail.com", // Replace with actual credentials
        password: "Raaxas12#", // Replace with actual credentials
      }),
    });

    const authBody = await authResponse.json();

    if (!authResponse.ok) {
      console.error("Failed to get access token:", authBody);
      return res.status(authResponse.status).json(authBody); // Return raw response body
    }

    const authToken = authBody.token; // Extract the token from the response

    // Prepare the request body for the manifest API
    const manifestRequestBody = {
      shipment_id: [shipment_id], // Pass shipment_id in an array
    };

    // Send the request to the external manifest generation API
    const manifestResponse = await fetch(MANIFEST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`, // Use the fetched authToken for authorization
      },
      body: JSON.stringify(manifestRequestBody),
    });

    const manifestBody = await manifestResponse.json();

    if (!manifestResponse.ok) {
      console.error("Failed to generate manifest:", manifestBody);
      return res.status(manifestResponse.status).json(manifestBody); // Return raw response body
    }

    // Update the Shipping document with the manifest URL if available
    const shippingDoc = await Shipping.findOneAndUpdate(
      { shipmentId: shipment_id },
      { manifestUrl: manifestBody.manifest_url }, // Adjust based on actual response structure
      { new: true } // Return the updated document
    );

    if (!shippingDoc) {
      return res.status(404).json({ message: "Shipping document not found" });
    }

    res.status(200).json(manifestBody); // Return raw response body
  } catch (error) {
    console.error("Error generating manifest:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

