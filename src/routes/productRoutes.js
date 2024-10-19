const express = require("express");
const router = express.Router();
const productController = require("../controllers/productsController");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), productController.uploadBulkProducts);

router.get("/products", productController.getProducts);
router.get("/products/search", productController.searchProducts);
router.get("/designerSearch", productController.searchProductsByDesigner);
module.exports = router;
