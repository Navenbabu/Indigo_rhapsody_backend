const express = require("express");
const router = express.Router();
const categoryController = require("./../controllers/categoryContoller");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });
router.post("/", upload.single("image"), categoryController.createCategory);
router.get("/", categoryController.getCategories);

module.exports = router;
