const mongoose = require("mongoose");

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
  fit: {
    type: String,
  },
  productDetails: {
    type: String,
  },
  material: {
    type: String,
  },
  is_customizable: {
    type: Boolean,
  },
  fabric: {
    type: String,
  },
  is_sustainable: {
    type: Boolean,
  },
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
  variants: [
    {
      color: {
        type: String,
        required: true,
      },
      imageList: [
        {
          type: String,
          required: true, // Each color variant can have its own images
        },
      ],
      sizes: [
        {
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
        },
      ],
    },
  ],
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
      comment: {
        type: String,
      },
      createdDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  totalRatings: {
    type: Number,
    default: 0, // Total number of ratings
  },
  averageRating: {
    type: Number,
    default: 0, // Average rating of the product (calculated based on reviews)
  },
});

module.exports = mongoose.model("Product", productsSchema);
