const mongoose = require("mongoose");

const ShippingSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  order_date: {
    type: Date,
    required: true,
  },
  pickup_location: {
    type: String,
    required: true,
  },
  channel_id: {
    type: Number,
    required: true,
  },
  comment: {
    type: String,
  },
  billing_customer_name: {
    type: String,
  },
  billing_address: {
    type: String,
  },
  billing_address_2: {
    type: String,
  },
  billing_city: {
    type: String,
  },
  billing_country: {
    type: String,
  },
  billing_state: {
    type: String,
  },
  billing_pincode: {
    type: String,
  },
  billing_email: {
    type: String,
  },
  billing_phone: {
    type: String,
  },
  shipping_is_billing: {
    type: Boolean,
  },
  order_items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      quantity: {
        type: Number,
      },
      price: {
        type: Number,
      },
      productName:{
        type:String
      }
   
    },
  ],
  payment_method: {
    type: String,
  },
  total_discount: {
    type: Number,
  },
  sub_total: {
    type: Number,
  },
  length: {
    type: Number,
  },
  breadth: {
    type: Number,
  },
  height: {
    type: Number,
  },
  weight: {
    type: Number,
  },
});

module.exports = mongoose.model("Shipping", ShippingSchema);
