const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    default: 0,
  },
});

const variantSchema = new mongoose.Schema({
  color: {
    type: String,
    required: true,
  },
  imageList: [
    {
      type: String,
      required: true,
    },
  ],
  sizes: [sizeSchema],
});

const productsSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubCategory",
    required: true,
  },
  fit: String,
  productDetails: String,
  material: String,
  is_customizable: Boolean,
  fabric: String,
  is_sustainable: Boolean,
  in_stock: {
    type: Boolean,
    default: true,
  },
  designerRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Designer",
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  stock: {
    type: Number,
    default: 0,
  },
  coverImage: {
    type: String, // Store the URL of the cover image
  },
  variants: [variantSchema], // Embed variant schema inside product schema
  discount: {
    type: Number,
    default: 0,
  },
  reviews: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      comment: String,
      createdDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  totalRatings: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Product", productsSchema);
