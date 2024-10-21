const mongoose = require("mongoose");

const fitsFilter = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("FitFilter", fitsFilter);
