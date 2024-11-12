const mongoose = require("mongoose");
const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  image: {
    type: String,
    // required: true,
  },
});

module.exports = mongoose.model("SubCategory", subCategorySchema);
