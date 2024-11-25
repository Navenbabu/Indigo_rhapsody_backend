const mongoose = require("mongoose");
const fetch = require("node-fetch");
const Orders = require("../models/orderModel");
const Shipping = require("../models/shippingModel");
const Designer = require("../models/designerModel");
const {
  sendFcmNotification,
} = require("../controllers/notificationController"); // Import the Shipping model if needed

const SHIP_API_URL =
  "https://indigorhapsodyserver.vercel.app/orders/create/adhoc";
const INVOICE_API_URL =
  "https://indigorhapsodyserver-h9a3.vercel.app/manifests/generate";
const AUTH_API_URL = "https://indigorhapsodyserver-h9a3.vercel.app/auth/login";

const MANIFEST_API_URL =
  "https://indigorhapsodyserver-h9a3.vercel.app/courier/generate/label";

const SHIPROCKET_RETURN_API_URL =
  "https://apiv2.shiprocket.in/v1/external/orders/create/return";
exports.ship = async (req, res) => {
  try {
    console.log("Starting ship function...");
    const { orderId, length, pickup_Location, breadth, height, weight } =
      req.body;

    if (!orderId) {
      console.log("Order ID not provided");
      return res.status(400).json({ message: "orderId is required." });
    }

    console.log("Checking if shipping already exists for orderId...");
    const existingShipping = await Shipping.findOne({ order_id: orderId });
    if (existingShipping) {
      console.log("Shipping already exists for this orderId:", orderId);
      return res.status(400).json({
        message: "Shipping has already been created for this orderId.",
        data: existingShipping,
      });
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
      billing_pincode: order.userId.pincode || "000000",
      billing_state: order.shippingDetails?.address?.state || "N/A",
      billing_country: order.shippingDetails?.address?.country || "N/A",
      billing_email: order.userId.email || "example@example.com",
      billing_phone: order.userId.phoneNumber,
      shipping_is_billing: true,
      order_items: order.products
        .map((product) =>
          product.productId.designerRef === designerRef
            ? {
                name: product.productId.productName,
                sku: product.productId.sku,
                units: product.quantity,
                selling_price: product.price,
                productId: product.productId._id,
              }
            : null
        )
        .filter(Boolean),
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

    const { shipment_id, status } = responseBody;
    console.log("Shipping created successfully with shipment ID:", shipment_id);

    order.products.forEach((product) => {
      product.shipping_status = "Order-Shipped";
    });

    await order.save();
    console.log("Shipping status updated in Order document");

    const shippingDoc = new Shipping({
      order_id: orderId, // Store the original order ID
      shipmentId: shipment_id,
      status: status,
      designerRef: designerRef, // Store designerRef at the top level
      productDetails: order.products.map((product) => ({
        productId: product.productId._id,
      })),
      invoiceUrl: "",
      length: length || 10,
      breadth: breadth || 5,
      height: height || 8,
      weight: weight || 1.5,
      order_date: order.orderDate,
      pickup_location: pickup_Location || "Default Location",
    });

    console.log("Saving Shipping document...");
    await shippingDoc.save();

    res.status(200).json({
      message: "Shipping order created successfully",
      data: responseBody,
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
      { invoiceUrl: manifestBody.label_url }, // Adjust based on actual response structure
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
      return res
        .status(404)
        .json({ message: "No shippings found for the given designerRef." });
    }

    console.log("Shipping documents found:", shippings);
    res.status(200).json({
      message: "Shipping documents retrieved successfully",
      shippings,
    });
  } catch (error) {
    console.error(
      "Error fetching shipping documents by designerRef:",
      error.message
    );
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

exports.createReturnRequestForDesigner = async (req, res) => {
  try {
    console.log("Starting createReturnRequestForDesigner function...");

    const { returnId, designerRef } = req.body; // Get returnId from request body

    // Validate required fields
    if (!returnId) {
      console.log("Return ID not provided");
      return res.status(400).json({ message: "returnId is required." });
    }

    // Define getShiprocketToken function if not already defined
    async function getShiprocketToken() {
      const authResponse = await fetch(AUTH_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "rajatjiedm@gmail.com", // Replace with your actual email
          password: "Raaxas12#", // Replace with your actual password
        }),
      });

      const authBody = await authResponse.json();

      if (!authResponse.ok) {
        console.error("Failed to get access token:", authBody);
        throw new Error(authBody.message || "Failed to get access token");
      }

      return authBody.token; // Return the token for use in other API calls
    }

    console.log("Fetching access token...");
    const authToken = await getShiprocketToken();
    console.log("Access token obtained:", authToken);

    // Find the order containing the product with the given returnId
    console.log("Fetching order details...");
    const order = await Orders.findOne({ "products.returnId": returnId })
      .populate({
        path: "products.productId",
        select: "productName sku designerRef imageUrl",
      })
      .populate("userId");

    if (!order) {
      console.log("Order not found for returnId:", returnId);
      return res
        .status(404)
        .json({ message: "Order not found for the provided returnId." });
    }

    console.log("Order details fetched successfully:", order);

    // Find the product with the given returnId
    const product = order.products.find((prod) => prod.returnId === returnId);

    if (!product) {
      console.log("Product not found with returnId:", returnId);
      return res
        .status(404)
        .json({ message: "Product not found with the provided returnId." });
    }

    console.log("Product details fetched successfully:", product);

    // Extract designerRef from the product

    if (!designerRef) {
      console.log("DesignerRef not found in product");
      return res
        .status(404)
        .json({ message: "DesignerRef not found in product" });
    }

    // Fetch designer details
    console.log("Fetching designer details...");
    const designer = await Designer.findOne({ _id: designerRef }).populate(
      "userId"
    );

    if (!designer) {
      console.log("Designer not found for designerRef:", designerRef);
      return res.status(404).json({ message: "Designer not found" });
    }

    console.log("Designer details fetched successfully:", designer);

    // Fetch the Shipping document to get dimensions
    console.log("Fetching shipping details...");
    const shippingDoc = await Shipping.findOne({ order_id: order.orderId });

    if (!shippingDoc) {
      console.log("Shipping document not found for orderId:", order.orderId);
      return res.status(404).json({ message: "Shipping details not found" });
    }

    console.log("Shipping details fetched successfully:", shippingDoc);

    // Prepare the request body as per Shiprocket API requirements
    const requestBody = {
      order_id: returnId, // Use returnId as order_id for the return request
      order_date: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD format

      // Pickup (from Customer)
      pickup_customer_name: order.userId.displayName || "Customer Name",
      pickup_last_name: "", // Add if available
      pickup_address:
        order.shippingDetails?.address?.street || "Customer Address Line 1",
      pickup_city: order.shippingDetails?.address?.city || "Customer City",
      pickup_state: order.shippingDetails?.address?.state || "Customer State",
      pickup_pincode: order.userId.pincode || "000000",
      pickup_email: order.userId.email || "customer@example.com",
      pickup_phone: order.userId.phoneNumber || "0000000000",
      pickup_isd_code: "91",
      pickup_country: "India",

      // Shipping (to Designer)
      shipping_customer_name: designer.userId.name || "Designer Name",

      shipping_address: designer.userId.address || "Designer Address Line 1",
      shipping_city: designer.userId.city || "Designer City",
      shipping_state: designer.userId.state || "Designer State",
      shipping_pincode: designer.userId.pincode || "000000",
      shipping_email: designer.email || "designer@example.com",
      shipping_phone: designer.phoneNumber || "0000000000",
      shipping_isd_code: "91",
      shipping_country: "India",

      order_items: [
        {
          name: product.productName,

          sku: product.sku,
          units: product.quantity,
          selling_price: product.price,
        },
      ],
      payment_method: order.paymentMethod || "PREPAID",
      sub_total: product.price * product.quantity,
      length: shippingDoc.length || 11,
      breadth: shippingDoc.breadth || 11,
      height: shippingDoc.height || 11,
      weight: shippingDoc.weight || 0.5,
    };

    console.log("Return order API request body:", requestBody);

    console.log("Sending request to Shiprocket return order API...");
    const response = await fetch(SHIPROCKET_RETURN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseBody = await response.json();
    console.log("Return order API response:", responseBody);

    if (!response.ok) {
      console.error("Failed to create return order:", responseBody);
      return res.status(response.status).json({
        error: responseBody.message || "Failed to create return order",
        details: responseBody,
      });
    }

    // Update the product's returnStatus and save the order
    product.returnStatus = "Return Initiated";
    await order.save();

    res.status(200).json({
      message: "Return order created successfully",
      data: responseBody,
    });

    console.log("Finished createReturnRequestForDesigner function");
  } catch (error) {
    console.error("Error creating return order:", error.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};
exports.addPickupLocation = async (req, res) => {
  try {
    const {
      pickup_location,
      name,
      email,
      phone,
      address,
      address_2,
      city,
      state,
      country,
      pin_code,
    } = req.body;

    // Validate required fields
    if (
      !pickup_location ||
      !name ||
      !email ||
      !phone ||
      !address ||
      !city ||
      !state ||
      !country ||
      !pin_code
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Fetch access token
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

    if (!authResponse.ok) {
      console.error("Failed to get access token:", authBody);
      return res.status(authResponse.status).json({
        error: authBody.message || "Failed to get access token",
      });
    }

    const authToken = authBody.token; // Extract the token from the response
    console.log("Access token obtained:", authToken);

    // Prepare the request body
    const requestBody = {
      pickup_location,
      name,
      email,
      phone,
      address,
      address_2: address_2 || "",
      city,
      state,
      country,
      pin_code,
    };

    console.log("Sending request to Shiprocket add pickup API...");
    const response = await fetch(
      "https://apiv2.shiprocket.in/v1/external/settings/company/addpickup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const responseBody = await response.json();
    console.log("Shiprocket add pickup API response:", responseBody);

    if (!response.ok) {
      console.error("Failed to add pickup location:", responseBody);
      return res.status(response.status).json({
        error: responseBody.message || "Failed to add pickup location",
        details: responseBody,
      });
    }

    res.status(200).json({
      message: "Pickup location added successfully",
      data: responseBody,
    });

    console.log("Finished addPickupLocation function");
  } catch (error) {
    console.error("Error adding pickup location:", error.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

exports.shippingWebhook = async (req, res) => {};
