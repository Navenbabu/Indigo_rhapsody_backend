const mongoose = require("mongoose");

const contentVideoSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    videoUrl: {
        type: String,
        required: true,
    },
    createdDate: {
        type: Date,
        default: Date.now,
    },
    no_of_likes: {
        type: Number,
        default: 0,
    },
    no_of_Shares:{
        type: Number,
        default: 0,
    },
    is_approved: {
        type: Boolean,
        default: false,
    },
});


module.exports = mongoose.model("ContentVideo", contentVideoSchema)