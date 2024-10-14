// src/middlewares/uploadMiddleware.js

const multer = require("multer");
const path = require("path");

// Define storage strategy
const storage = multer.memoryStorage(); // Store file in memory temporarily

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpeg, .png, .gif formats are allowed!"), false);
  }
};

// Set limits (optional)
const limits = {
  fileSize: 1024 * 1024 * 5, // Limit file size to 5MB
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits,
});

module.exports = upload;
