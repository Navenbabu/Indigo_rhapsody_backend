const mongoose = require("mongoose");
const axios = require("axios"); // Import axios to fetch the image
const Order = require("../models/orderModel");
const Product = require("../models/productModels");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");
const fs = require("fs");
const PDFDocument = require("pdfkit"); // To generate PDF invoices
const nodemailer = require("nodemailer");
const { bucket } = require("../service/firebaseServices");
const { DateTime } = require("luxon");
const {
  createNotification,
  sendFcmNotification,
} = require("../controllers/notificationController");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "sveccha.apps@gmail.com",
    pass: "4VhALB7qcgbYn0wv",
  },
});

const notifyDesignerByEmail = async (designerEmail, orderDetails) => {
  const mailOptions = {
    from: "sveccha.apps@gmail.com",
    to: designerEmail,
    subject: "New Order Notification",
    html: `
      <h1>New Order Available</h1>
      <p>Congratulations!A new order has been created that includes products designed by you.</p>
      <h2>Order Details</h2>
      <ul>
        ${orderDetails
          .map(
            (product) =>
              `<li>${product.productName} - ${product.quantity} x $${product.price}</li>`
          )
          .join("")}
      </ul>
      <p>Please log in to your dashboard to view and manage this order.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const generateAndUploadInvoice = async (order) => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `invoices/invoice-${order.orderId}.pdf`;
    const firebaseFile = bucket.file(fileName);
    const stream = firebaseFile.createWriteStream({
      metadata: { contentType: "application/pdf" },
    });

    // Ensure numerical properties are valid and default to 0 if undefined
    const subtotal = order.subtotal || 0;
    const discount = order.discount || 0;
    const tax = order.tax || 0;
    const totalAmount = order.amount || 0;

    // Logo URL
    const logoUrl =
      "https://firebasestorage.googleapis.com/v0/b/sveccha-11c31.appspot.com/o/Logo.png?alt=media&token=c8b4c22d-8256-4092-8b46-e89e001bd1fe";

    try {
      // Fetch the logo image as a buffer
      const response = await axios.get(logoUrl, {
        responseType: "arraybuffer",
      });
      const logoBuffer = Buffer.from(response.data, "binary");

      // Header Section
      doc
        .rect(0, 0, doc.page.width, 100)
        .fill("#f8f8f8")
        .fillColor("#000")
        .fontSize(24)
        .text("Invoice", 50, 40);

      // Add logo from buffer
      doc.image(logoBuffer, doc.page.width - 150, 30, { width: 100 });

      // Invoice Details
      doc
        .fontSize(12)
        .fillColor("#000")
        .text(`Invoice #: ${order.orderId}`, 50, 120)
        .text(
          `Date of Issue: ${new Date(order.createdDate).toLocaleDateString()}`
        );

      doc
        .text("Billed To:", 50, 160)
        .font("Helvetica-Bold")
        .text(order.userId?.displayName || "Customer Name")
        .font("Helvetica")
        .text(order.shippingDetails?.address?.street || "Street Address")
        .text(
          `${order.shippingDetails?.address?.city || "City"}, ${
            order.shippingDetails?.address?.state || "State"
          } - ${order.shippingDetails?.address?.country || "Country"}`,
          { align: "left" }
        );

      // Table Header
      doc.moveDown(2);
      const tableTop = 250;
      const tableColumns = ["Product Name", "Qty", "Rate", "Amount"];
      const columnWidths = [140, 60, 80, 80];

      tableColumns.forEach((text, i) => {
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(
            text,
            50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
            tableTop,
            {
              width: columnWidths[i],
              align: i === 4 ? "right" : "left",
            }
          );
      });

      // Draw Divider Line
      doc
        .strokeColor("#cccccc")
        .lineWidth(1)
        .moveTo(50, tableTop + 20)
        .lineTo(doc.page.width - 50, tableTop + 20)
        .stroke();

      // Table Rows
      let rowY = tableTop + 30;

      order.products.forEach((product) => {
        doc
          .font("Helvetica")
          .fontSize(10)
          .text(product.productName || "-", 50, rowY, {
            width: columnWidths[0],
          })
          .text(product.quantity || 0, 330, rowY, {
            width: columnWidths[1],
            align: "center",
          })
          .text(`₹${product.price || 0}`, 390, rowY, {
            width: columnWidths[2],
            align: "center",
          })
          .text(
            `₹${((product.price || 0) * (product.quantity || 0)).toFixed(2)}`,
            470,
            rowY,
            {
              width: columnWidths[3],
              align: "right",
            }
          );

        rowY += 20; // Move to the next row
      });

      // Total Summary
      const summaryTop = rowY + 20;

      doc
        .font("Helvetica-Bold")
        .text("Subtotal:", 400, summaryTop, { align: "left" })
        .text(`₹${order.subtotal.toFixed(2)}`, 470, summaryTop, {
          align: "right",
        });

      doc
        .font("Helvetica")
        .text("Discount:", 400, summaryTop + 15, { align: "left" })
        .text(`-₹${order.discountAmount.toFixed(2)}`, 470, summaryTop + 15, {
          align: "right",
        });

      doc
        .text("Tax (12%):", 400, summaryTop + 30, { align: "left" })
        .text(`₹${order.tax_amount.toFixed(2)}`, 470, summaryTop + 30, {
          align: "right",
        });

      doc
        .font("Helvetica-Bold")
        .text("Total:", 400, summaryTop + 45, { align: "left" })
        .text(`₹${order.amount.toFixed(2)}`, 470, summaryTop + 45, {
          align: "right",
        });

      // Footer Section
      doc.moveDown(2);

      doc
        .fontSize(10)
        .text("Conditions/Instructions:", 50, doc.page.height - 60)
        .text(
          order.instructions || "Please contact us if you have any questions.",
          50,
          doc.page.height - 45,
          { width: doc.page.width - 100 }
        );

      // Finalize PDF
      doc.end();
      doc.pipe(stream);

      // Upload to Firebase
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
    } catch (error) {
      console.error("Error fetching the logo:", error);
      reject(error);
    }
  });
};

exports.getTotalOrdersOfparticularDesigner = async (req, res) => {};

// Create Order Controller
// Create Order Controller

exports.createOrder = async (req, res) => {
  try {
    const { userId, cartId, paymentMethod, notes } = req.body;

    // Validate User
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const fcmToken = user.fcmToken;

    // Prepare Shipping Details
    const shippingDetails = {
      address: {
        street: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        country: "India",
      },
      phoneNumber: user.phoneNumber,
    };

    // Find the cart and populate product details
    const cart = await Cart.findOne({ _id: cartId, userId }).populate(
      "products.productId",
      "productName sku variants designerRef"
    );

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Prepare Order Products
    const orderProducts = cart.products.map((item) => {
      const product = item.productId;
      return {
        productId: product._id,
        productName: product.productName,
        designerRef: product.designerRef,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        sku: product.sku,
        price: item.price,
        discount: item.discount || 0,
      };
    });

    // Extract required fields from the cart
    const {
      total_amount,
      tax_amount,
      shipping_cost,
      discount_amount,
      subtotal,
    } = cart;

    // Create and save the new order
    const order = new Order({
      userId,
      amount: total_amount,
      cartId: cart._id,
      products: orderProducts,
      paymentMethod,
      shippingDetails,
      notes,
      tax_amount,
      shipping_cost,
      discountAmount: discount_amount,
      subtotal,
      orderId: `ORD-${Date.now()}`,
    });

    await order.save();

    // Clear the user's cart
    cart.products = [];
    cart.discount_amount = 0;
    await cart.save();

    const designerEmails = new Set();
    for (const product of orderProducts) {
      const designer = await User.findById(product.designerRef).select("email");
      if (designer) designerEmails.add(designer.email);
    }

    // Send email notification to each designer
    designerEmails.forEach(async (email) => {
      try {
        await notifyDesignerByEmail(email, orderProducts);
      } catch (error) {
        console.error(`Error sending email to designer ${email}:`, error);
      }
    });

    const email = user.email;

    // Generate and upload the invoice to Firebase
    const firebaseUrl = await generateAndUploadInvoice(order);

    // Send confirmation email with invoice link
    const mailOptions = {
      from: "sveccha.apps@gmail.com",
      to: email,
      subject: "Order Confirmation",
      html: `
       <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order Confirmation</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f9f9f9;
      }
      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
      .header {
        background-color: #004080;
        color: #ffffff;
        text-align: center;
        padding: 20px;
      }
      .header img {
        max-width: 100px;
        margin-bottom: 10px;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
      }
      .header p {
        margin: 5px 0 0;
        font-size: 14px;
      }
      .content {
        padding: 20px;
        color: #333333;
      }
      .content h2 {
        font-size: 20px;
        margin-bottom: 10px;
        color: #004080;
      }
      .content p {
        font-size: 16px;
        margin: 10px 0;
      }
      .content .order-details {
        margin: 20px 0;
      }
      .content .order-details table {
        width: 100%;
        border-collapse: collapse;
      }
      .content .order-details table th,
      .content .order-details table td {
        text-align: left;
        padding: 8px;
        border-bottom: 1px solid #eeeeee;
      }
      .content .order-details table th {
        color: #666666;
      }
      .content .total {
        font-size: 18px;
        margin: 10px 0;
      }
      .footer {
        background-color: #f4f4f4;
        padding: 15px;
        text-align: center;
        font-size: 14px;
        color: #999999;
      }
      .footer a {
        color: #004080;
        text-decoration: none;
        margin: 0 5px;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header Section -->
      <div class="header">
        <img
          src="https://firebasestorage.googleapis.com/v0/b/sveccha-11c31.appspot.com/o/Logo.png?alt=media&token=c8b4c22d-8256-4092-8b46-e89e001bd1fe"
          alt="Logo"
        />
        <h1>Order Received!</h1>
        <p>Order No: ${order.orderNumber}</p>
      </div>

      <!-- Content Section -->
      <div class="content">
        <h2>Hello, ${order.userId.displayName}!</h2>
        <p>
          Thank you for your order. Your order has been received and will be
          processed shortly. Below are the details of your order:
        </p>

        <!-- Order Details -->
        <div class="order-details">
          <table>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Price</th>
            </tr>
            ${orderProducts
              .map(
                (product) => `
            <tr>
              <td>${product.productName}</td>
              <td>${product.quantity}</td>
              <td>${product.price}</td>
            </tr>
            `
              )
              .join("")}
          </table>
        </div>

        <p class="total"><strong>Subtotal:</strong> ${subtotal}</p>
        <p class="total"><strong>Tax:</strong> ${tax_amount}</p>
        <p class="total"><strong>Shipping:</strong> ${shipping_cost}</p>
        <p class="total"><strong>Discount:</strong> -${discount_amount}</p>
        <p class="total"><strong>Total Amount:</strong> ${total_amount}</p>

        <p>You can download your invoice <a href="${firebaseUrl}">here</a>.</p>
        <p>
          If you have any questions, feel free to reply to this email. Thank you
          for shopping with us!
        </p>
      </div>

      <!-- Footer Section -->
      <div class="footer">
        <p>
          Follow us:
          <a href="https://twitter.com" target="_blank">Twitter</a> |
          <a href="https://facebook.com" target="_blank">Facebook</a> |
          <a href="https://instagram.com" target="_blank">Instagram</a>
        </p>
        <p>Unsubscribe | Privacy Policy</p>
      </div>
    </div>
  </body>
</html>

      `,
    };

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({
          message: "Order created, but failed to send email",
          error: error.message,
        });
      } else {
        console.log("Email sent:", info.response);

        // Extract unique designer IDs
        const designerIds = [
          ...new Set(orderProducts.map((p) => p.designerRef.toString())),
        ];

        // Create notifications for each designer
        for (const designerId of designerIds) {
          try {
            await createNotification({
              userId: user._id,
              designeref: designerId,
              message: `A new order has been placed by ${user.displayName}`,
              orderId: order._id,
            });
          } catch (notifError) {
            console.error(
              `Error creating notification for designer ${designerId}:`,
              notifError.message
            );
          }
        }

        if (fcmToken) {
          await sendFcmNotification(
            fcmToken,
            "Order Placed Successfully",
            `Your order with ID ${order.orderId} has been placed successfully.`
          );
        } else {
          console.warn("User has no FCM token, notification not sent.");
        }

        return res.status(201).json({
          message:
            "Order created, email sent, and notifications created successfully",
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

exports.getOrdersByDesignerRef = async (req, res) => {
  try {
    const { designerRef } = req.params;

    const orders = await Order.find({
      "products.designerRef": designerRef,
    })
      .populate({
        path: "products.productId",
        select: "productName",
      })
      .populate({
        path: "userId",
        select: "displayName phoneNumber email",
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
        userId: {
          displayName: order.userId.displayName,
          phoneNumber: order.userId.phoneNumber,
          email: order.userId.email,
        },
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

    // Find all orders for the user and sort by newest first
    const orders = await Order.find({ userId })
      .sort({ createdDate: -1 }) // Sort by createdDate in descending order
      .populate({
        path: "products.productId",
        select: "productName",
      });

    if (!orders.length) {
      return res.status(404).json({ message: "No orders found" });
    }

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
        select: "productName sku coverImage",
      })
      .populate({
        path: "userId",
        select: "name email",
      });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Format the createDate to IST
    const createDateIST = DateTime.fromJSDate(order.createdDate) // assuming `createdAt` is the field storing the order creation time
      .setZone("Asia/Kolkata")
      .toLocaleString(DateTime.DATETIME_MED);

    // Add the formatted createDate to the response
    const orderResponse = {
      ...order.toObject(),
      createDate: createDateIST,
    };

    return res.status(200).json({ order: orderResponse });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return res.status(500).json({
      message: "Error fetching order",
      error: error.message,
    });
  }
};

exports.getTotalOrderCount = async (req, res) => {
  try {
    // Count the total number of documents in the Order collection
    const totalOrders = await Order.countDocuments();

    return res.status(200).json({ totalOrders });
  } catch (error) {
    console.error("Error fetching total order count:", error);
    return res.status(500).json({
      message: "Error fetching total order count",
      error: error.message,
    });
  }
};

exports.getMonthlyOrderStats = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1; // Default to current month
    const year = parseInt(req.query.year) || new Date().getFullYear(); // Default to current year

    // Define the start and end dates for the month
    const startDate = new Date(year, month - 1, 1); // First day of the specified month
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the specified month

    const dailyOrders = await Order.aggregate([
      {
        $match: {
          createdDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { day: { $dayOfMonth: "$createdDate" } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$amount" },
        },
      },
      {
        $sort: { "_id.day": 1 },
      },
    ]);

    const formattedData = dailyOrders.map((entry) => ({
      day: entry._id.day,
      totalOrders: entry.totalOrders,
      totalRevenue: entry.totalRevenue,
    }));

    res.status(200).json({ dailyStats: formattedData });
  } catch (error) {
    console.error("Error fetching monthly order stats:", error);
    res.status(500).json({
      message: "Error fetching monthly order stats",
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

// Endpoint to get total orders by designers
exports.getTotalOrdersByDesigners = async (req, res) => {
  try {
    // Aggregate orders to count total number of orders per designer
    const totalOrdersByDesigner = await Order.aggregate([
      { $unwind: "$products" }, // Unwind products to process each product individually
      {
        $group: {
          _id: "$products.designerRef", // Group by designerRef
          totalOrders: { $sum: 1 }, // Increment for each product
        },
      },
      {
        $lookup: {
          from: "designers", // Adjust the name if your designer collection is different
          localField: "_id",
          foreignField: "_id",
          as: "designerDetails",
        },
      },
      {
        $project: {
          _id: 0,
          designerRef: "$_id",
          totalOrders: 1,
          designerDetails: { $arrayElemAt: ["$designerDetails", 0] }, // Get the first (and only) element
        },
      },
    ]);

    if (totalOrdersByDesigner.length === 0) {
      return res.status(404).json({ message: "No orders found for designers" });
    }

    return res.status(200).json({ totalOrdersByDesigner });
  } catch (error) {
    console.error("Error fetching total orders by designers:", error);
    return res.status(500).json({
      message: "Error fetching total orders by designers",
      error: error.message,
    });
  }
};

// Endpoint to get total sales (total amount of all orders)
exports.getTotalSales = async (req, res) => {
  try {
    // Aggregate to calculate the total sales amount
    const totalSales = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalSalesAmount: { $sum: "$amount" }, // Sum the total amount of each order
        },
      },
      {
        $project: {
          _id: 0,
          totalSalesAmount: 1,
        },
      },
    ]);

    if (totalSales.length === 0) {
      return res.status(404).json({ message: "No sales data found" });
    }

    return res.status(200).json({ totalSales: totalSales[0].totalSalesAmount });
  } catch (error) {
    console.error("Error fetching total sales amount:", error);
    return res.status(500).json({
      message: "Error fetching total sales amount",
      error: error.message,
    });
  }
};

// Endpoint to get total orders for a particular designer by ID
exports.getTotalOrdersForDesigner = async (req, res) => {
  try {
    const { designerId } = req.params; // Get the designer ID from the request parameters

    // Aggregate to count the total number of orders per designer
    const totalOrders = await Order.aggregate([
      { $unwind: "$products" }, // Unwind products to group by designerRef
      { $match: { "products.designerRef": designerId } }, // Match the specific designer ID
      {
        $group: {
          _id: "$products.designerRef",
          totalOrders: { $sum: 1 }, // Count each order that includes the designer's products
        },
      },
    ]);

    if (totalOrders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for this designer" });
    }

    return res
      .status(200)
      .json({ designerId, totalOrders: totalOrders[0].totalOrders });
  } catch (error) {
    console.error("Error fetching total orders for designer:", error);
    return res.status(500).json({
      message: "Error fetching total orders for designer",
      error: error.message,
    });
  }
};

// Endpoint to get total sales for a particular designer by ID
exports.getTotalSalesForDesigner = async (req, res) => {
  try {
    const { designerId } = req.params; // Get the designer ID from the request parameters

    // Aggregate to calculate the total sales amount for a specific designer
    const totalSales = await Order.aggregate([
      { $unwind: "$products" }, // Unwind products to group by designerRef
      { $match: { "products.designerRef": designerId } }, // Match the specific designer ID
      {
        $group: {
          _id: "$products.designerRef",
          totalSalesAmount: {
            $sum: { $multiply: ["$products.price", "$products.quantity"] },
          }, // Calculate the total sales amount
        },
      },
    ]);

    if (totalSales.length === 0) {
      return res
        .status(404)
        .json({ message: "No sales data found for this designer" });
    }

    return res
      .status(200)
      .json({ designerId, totalSalesAmount: totalSales[0].totalSalesAmount });
  } catch (error) {
    console.error("Error fetching total sales for designer:", error);
    return res.status(500).json({
      message: "Error fetching total sales for designer",
      error: error.message,
    });
  }
};

exports.createReturnRequestForDesigner = async (req, res) => {};
