const express = require("express");
const router = express.Router();
const bannerController = require("../controllers/bannerController");
const multer = require("multer");

// Configure Multer for image uploads (using memory storage for Firebase)
const storage = multer.memoryStorage();
const upload = multer({ storage });


router.post("/", upload.single("file"), bannerController.createBanner);


router.get("/", bannerController.getBanners);

// Update Banner by ID (with optional image upload)
router.put("/:bannerId", upload.single("file"), bannerController.updateBanner);

// Delete Banner by ID
router.delete("/:bannerId", bannerController.deleteBanner);

module.exports = router;
