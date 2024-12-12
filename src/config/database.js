const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb+srv://rajatsaxena:Rajat123saxena@cluster0.6jgl6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      // useCreateIndex: true, // Uncomment if using older versions of Mongoose
      // useFindAndModify: false, // Uncomment if using older versions of Mongoose
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
