const mongoose = require("mongoose");

const colorFilterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model("ColorFilter", colorFilterSchema);
