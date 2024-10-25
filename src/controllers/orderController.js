const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Product = require("../models/productModels");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");
const fs = require("fs");
const PDFDocument = require("pdfkit"); // To generate PDF invoices
const nodemailer = require("nodemailer");
const { bucket } = require("../service/firebaseServices"); // To send emails

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "sveccha.apps@gmail.com",
    pass: "4VhALB7qcgbYn0wv",
  },
});

// Helper function to generate and upload PDF to Firebase
const generateAndUploadInvoice = async (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `invoices/invoice-${order.orderId}.pdf`;
    const firebaseFile = bucket.file(fileName);
    const stream = firebaseFile.createWriteStream({
      metadata: { contentType: "application/pdf" },
    });

    // Generate the PDF content
    doc.fontSize(20).text("Order Invoice", { align: "center" }).moveDown();
    doc
      .fontSize(12)
      .text(`Order ID: ${order.orderId}`)
      .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`)
      .moveDown();

    order.products.forEach((product) => {
      doc
        .text(`Product: ${product.productName}`)
        .text(`Color: ${product.color}`)
        .text(`Size: ${product.size}`)
        .text(`SKU: ${product.sku}`)
        .text(`Quantity: ${product.quantity}`)
        .text(`Price: $${product.price}`)
        .text(`Discount: -$${product.discount}`)
        .moveDown();
    });

    doc.text(`Total Amount: $${order.amount}`, { align: "right" });

    // Finalize the PDF and pipe it to Firebase storage
    doc.end();
    doc.pipe(stream);

    stream.on("finish", async () => {
      const [url] = await firebaseFile.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });
      resolve(url); // Return the Firebase URL
    });

    stream.on("error", (error) => {
      console.error("Error uploading PDF to Firebase:", error);
      reject(error);
    });
  });
};
exports.getTotalOrdersOfparticularDesigner = async (req, res) => {};

// Create Order Controller
// Create Order Controller
exports.createOrder = async (req, res) => {
  try {
    const { userId, cartId, paymentMethod, notes } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const shippingDetails = {
      address: {
        street: user.address, // Adjust field names based on your User model
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        country: user.country || "Default Country", // Provide default if necessary
      },
      phoneNumber: user.phoneNumber,
      // Include any other necessary fields
    };

    // Find the user's cart and populate product details
    const cart = await Cart.findOne({ _id: cartId, userId }).populate(
      "products.productId",
      "productName sku variants designerRef"
    );

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Calculate total amount and prepare order details
    let totalAmount = 0;
    const orderProducts = cart.products.map((item) => {
      const product = item.productId;
      const variant = product.variants?.find((v) => v.color === item.color);
      const sizeVariant = variant?.sizes?.find((s) => s.size === item.size);

      if (!variant || !sizeVariant) {
        throw new Error(
          `Variant or size not found for product '${product.productName}'`
        );
      }

      const price = sizeVariant.price;
      totalAmount += price * item.quantity;

      // Prepare the product object for the order, including designerRef
      return {
        productId: product._id,
        productName: product.productName,
        designerRef: product.designerRef, // Store the designer reference
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        sku: product.sku,
        price: price,
        discount: item.discount || 0,
      };
    });

    // Create and save the new order
    const order = new Order({
      userId,
      amount: totalAmount,
      cartId: cart._id,
      products: orderProducts,
      paymentMethod,
      shippingDetails,
      notes,
      orderId: `ORD-${Date.now()}`,
    });

    await order.save();

    // Clear the user's cart
    cart.products = [];
    await cart.save();

    // Get the user's email address

    if (!user) return res.status(404).json({ message: "User not found" });

    const email = user.email;

    // Generate and upload the invoice to Firebase
    const firebaseUrl = await generateAndUploadInvoice(order);

    // Send Email with Invoice Link
    const mailOptions = {
      from: "sveccha.apps@gmail.com",
      to: email,
      subject: "Order Confirmation",
      html: `
        <h1>Order Confirmation</h1>
        <p>Dear ${user.displayName},</p>
        <p>Thank you for your order. Below are your order details:</p>
        <h2>Order Summary</h2>
        <ul>
          ${orderProducts
            .map(
              (product) =>
                `<li>${product.productName} - ${product.quantity} x $${product.price}</li>`
            )
            .join("")}
        </ul>
        <p><strong>Total Amount:</strong> $${order.amount}</p>
        <p>You can download your invoice <a href="${firebaseUrl}">here</a>.</p>
        <p>Thank you for shopping with us!</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({
          message: "Order created, but failed to send email",
          error: error.message,
        });
      } else {
        console.log("Email sent:", info.response);
        return res.status(201).json({
          message: "Order created and email sent successfully",
          order,
        });
      }
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res
      .status(500)
      .json({ message: "Error creating order", error: error.message });
  }
};
// Get Orders by Designer Reference
exports.getOrdersByDesignerRef = async (req, res) => {
  try {
    const { designerRef } = req.params;

    // Query the orders collection to find orders with products matching the designerRef
    const orders = await Order.find({
      "products.designerRef": designerRef,
    }).populate({
      path: "products.productId",
      select: "productName",
    });

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: "No orders found for this designer" });
    }

    // Filter products by designerRef and calculate the total amount for each order
    const filteredOrders = orders.map((order) => {
      const designerProducts = order.products.filter(
        (product) => product.designerRef === designerRef
      );

      // Calculate the amount only for the designer's products
      const designerAmount = designerProducts.reduce(
        (total, product) => total + product.price * product.quantity,
        0
      );

      return {
        orderId: order.orderId,
        userId: order.userId,
        products: designerProducts,
        amount: designerAmount,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt,
        address: order.shippingDetails.address,
        city: order.shippingDetails.address.city,
        state: order.shippingDetails.address.state,
        pincode: order.shippingDetails.address.pincode,
        country: order.shippingDetails.address.country,
      };
    });

    return res.status(200).json({ orders: filteredOrders });
  } catch (error) {
    console.error("Error fetching orders by designerRef:", error);
    return res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
};

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

exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Ensure the orderId is converted to a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid Order ID" });
    }

    // Find the order by ObjectId
    const order = await Order.findById(orderId)
      .populate({
        path: "products.productId",
        select: "productName sku",
      })
      .populate({
        path: "userId",
        select: "name email",
      });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return res.status(500).json({
      message: "Error fetching order",
      error: error.message,
    });
  }
};
exports.createReturnRequest = async (req, res) => {
  try {
    const { orderId, productId, reason } = req.body;

    // Ensure productId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid productId format" });
    }

    // Find the order by ID and ensure it contains the product
    const order = await Order.findOne({
      _id: orderId,
      "products.productId": productId,
    });

    if (!order) {
      return res.status(404).json({ message: "Order or Product not found" });
    }

    // Find the specific product within the order
    const product = order.products.find(
      (p) => p.productId.toString() === productId.toString()
    );

    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found in the order" });
    }

    // Mark product for return and update return status
    product.returnRequest = true;
    product.returnStatus = "requested";
    product.returnId = `RET-${Date.now()}`; // Example return ID

    await order.save();

    return res.status(200).json({
      message: "Return request created successfully",
      product: {
        productId: product.productId,
        productName: product.productName,
        designerRef: product.designerRef,
        returnId: product.returnId,
        returnStatus: product.returnStatus,
        reason: reason || "Not provided",
      },
    });
  } catch (error) {
    console.error("Error creating return request:", error);
    return res.status(500).json({
      message: "Error creating return request",
      error: error.message,
    });
  }
};

exports.getReturnRequestsByDesigner = async (req, res) => {
  try {
    const { designerRef } = req.params;

    // Aggregation to find products with return requests for the given designerRef
    const returnRequests = await Order.aggregate([
      { $unwind: "$products" }, // Unwind products to access them individually
      {
        $match: {
          "products.designerRef": designerRef,
          "products.returnRequest": true,
        },
      },
      {
        $project: {
          orderId: 1,
          "products.productId": 1,
          "products.productName": 1,
          "products.quantity": 1,
          "products.returnId": 1,
          "products.returnStatus": 1,
          "products.color": 1,
          "products.size": 1,
          createdDate: 1,
        },
      },
    ]);

    if (returnRequests.length === 0) {
      return res.status(404).json({
        message: "No return requests found for this designer",
      });
    }

    return res.status(200).json({
      message: "Return requests fetched successfully",
      returnRequests,
    });
  } catch (error) {
    console.error("Error fetching return requests:", error);
    return res.status(500).json({
      message: "Error fetching return requests",
      error: error.message,
    });
  }
};
