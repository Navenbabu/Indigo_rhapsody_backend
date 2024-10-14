const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  image: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Category", categorySchema);
