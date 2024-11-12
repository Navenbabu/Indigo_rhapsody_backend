const express = require("express");
const router = express.Router();
const categoryController = require("./../controllers/categoryContoller");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });
router.post("/", categoryController.createCategory);
router.get("/", categoryController.getCategories);
router.put(
  "/category/:categoryId",
  upload.single("image"),
  categoryController.updateCategory
);
router.delete("/category/:categoryId", categoryController.deleteCategory);

module.exports = router;
