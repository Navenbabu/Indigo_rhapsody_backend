// src/middlewares/uploadMiddleware.js

const multer = require("multer");
const path = require("path");

// Define storage strategy (memory storage for temporary Firebase uploads)
const storage = multer.memoryStorage();

// File filter to allow only specific file formats
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(
      new Error("Only .jpeg, .png, .gif, and .pdf formats are allowed!"),
      false
    );
  }
};

// Set limits on file size (optional)
const limits = {
  fileSize: 1024 * 1024 * 5, // 5MB limit
};

// Configure Multer middleware
const upload = multer({
  storage,
  fileFilter,
  limits,
});

// Export the configured upload middleware
module.exports = upload;
