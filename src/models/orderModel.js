const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  shipmentId: {
    type: String,
  },
  cartId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cart",
  },
  items: [
    {
      cartId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cart",
        required: true,
      },
    },
  ],
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      productName: {
        type: String,
        required: true,
      },
      designerRef: {
        type: String,
      },

      sku: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      size: {
        type: String,
      },
      color: {
        type: String,
      },
      price: {
        type: Number,
      },
      discount: {
        type: Number,
        default: 0,
      },
    },
  ],
  paymentMethod: {
    type: String,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Completed", "Failed", "Refunded"],
    default: "Pending",
  },
  discountApplied: {
    type: Boolean,
    default: false,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  shippingDetails: {
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    shippingMethod: {
      type: String,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    trackingNumber: {
      type: String,
    },
    estimatedDeliveryDate: {
      type: Date,
    },
  },
  status: {
    type: String,
    enum: [
      "Order Placed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Returned",
    ],
    default: "Order Placed",
  },
  statusTimestamps: {
    orderPlaced: {
      type: Date,
      default: Date.now,
    },
    processing: Date,
    shipped: Date,
    delivered: Date,
    cancelled: Date,
    returned: Date,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  orderId: {
    type: String,
    required: true,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
  },
});

module.exports = mongoose.model("Order", OrderSchema);
