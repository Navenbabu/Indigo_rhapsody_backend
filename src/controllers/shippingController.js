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
    console.log("Starting ship function...");
    const { orderId, length, pickup_Location, breadth, height, weight } =
      req.body;

    if (!orderId) {
      console.log("Order ID not provided");
      return res.status(400).json({ message: "orderId is required." });
    }

    console.log("Fetching access token...");
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
    console.log("Access token response:", authBody);

    if (!authResponse.ok) {
      console.error("Failed to get access token:", authBody);
      return res.status(authResponse.status).json({
        error: authBody.message || "Failed to get access token",
      });
    }

    const authToken = authBody.token;
    console.log("Access token obtained:", authToken);

    console.log("Fetching order details...");
    const order = await Orders.findOne({ orderId })
      .populate({
        path: "products.productId",
        select: "productName sku designerRef",
      })
      .populate("userId");

    if (!order) {
      console.log("Order not found for orderId:", orderId);
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("Order details fetched successfully:", order);

    // Extract designerRef from the first product or adapt as needed
    const designerRef = order.products[0]?.productId.designerRef || "N/A";

    const requestBody = {
      order_id: order.orderId,
      order_date: order.orderDate.toISOString(),
      pickup_location: pickup_Location || "Default Location",
      comment: "Order shipping initiated.",
      billing_customer_name: order.userId.displayName || "N/A",
      billing_last_name: "LastName",
      billing_address: order.shippingDetails?.address?.street || "N/A",
      billing_address_2: "Address Line 2",
      billing_city: order.shippingDetails?.address?.city || "N/A",
      billing_pincode: order.shippingDetails?.address?.postalCode || "000000",
      billing_state: order.shippingDetails?.address?.state || "N/A",
      billing_country: order.shippingDetails?.address?.country || "N/A",
      billing_email: order.userId.email || "example@example.com",
      billing_phone: "+919560360744",
      shipping_is_billing: true,
      order_items: order.products.map((product) => ({
        name: product.productId.productName,
        sku: product.productId.sku,
        units: product.quantity,
        selling_price: product.price,
        productId: product.productId._id,
      })),
      payment_method: order.paymentMethod,
      total_discount: order.discountAmount || 0,
      sub_total: order.amount,
      length: length || 10,
      breadth: breadth || 5,
      height: height || 8,
      weight: weight || 1.5,
    };

    console.log("Shipping API request body:", requestBody);

    console.log("Sending request to shipping API...");
    const response = await fetch(SHIP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseBody = await response.json();
    console.log("Shipping API response:", responseBody);

    if (!response.ok) {
      console.error("Failed to create shipping:", responseBody);
      return res.status(response.status).json({
        error: responseBody.message || "Failed to create shipping order",
      });
    }

    const { shipment_id, status, order_id } = responseBody;
    console.log("Shipping created successfully with shipment ID:", shipment_id);

    const shippingDoc = new Shipping({
      order_id: orderId, // Store the original order ID
      shipmentId: shipment_id,
      status: status,
      designerRef: designerRef, // Store designerRef at the top level
      productDetails: order.products.map((product) => ({
        productId: product.productId._id,
      })),
      invoiceUrl: "",
      order_date: order.orderDate,
      pickup_location: pickup_Location || "Default Location",
    });

    console.log("Generating invoice...");
    const invoiceRequestBody = {
      shipment_id: [shipment_id],
    };

    console.log("Invoice request body:", invoiceRequestBody);
    const invoiceResponse = await fetch(INVOICE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(invoiceRequestBody),
    });

    const invoiceBody = await invoiceResponse.json();
    console.log("Invoice API response:", invoiceBody);

    if (!invoiceResponse.ok) {
      console.error("Failed to generate invoice:", invoiceBody);
      return res.status(invoiceResponse.status).json(invoiceBody);
    }

    shippingDoc.invoiceUrl = invoiceBody.invoice_url;
    await shippingDoc.save();
    console.log("Invoice URL saved in Shipping document");

    order.invoiceUrl = invoiceBody.invoice_url;
    await order.save();
    console.log("Invoice URL updated in Order document");

    res.status(200).json({
      message: "Shipping order created successfully",
      data: responseBody,
      invoiceUrl: invoiceBody.invoice_url,
    });
    console.log("Finished ship function");
  } catch (error) {
    console.error("Error creating shipping order:", error.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
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
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
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
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};


exports.getShippingsByDesignerRef = async (req, res) => {
  try {
    const { designerRef } = req.params;

    if (!designerRef) {
      return res.status(400).json({ message: "designerRef is required." });
    }

    console.log("Fetching Shipping documents for designerRef:", designerRef);
    
    const shippings = await Shipping.find({ designerRef });

    if (!shippings.length) {
      return res.status(404).json({ message: "No shippings found for the given designerRef." });
    }

    console.log("Shipping documents found:", shippings);
    res.status(200).json({ message: "Shipping documents retrieved successfully", shippings });
  } catch (error) {
    console.error("Error fetching shipping documents by designerRef:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};