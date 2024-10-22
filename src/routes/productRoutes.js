const express = require("express");
const router = express.Router();
const productController = require("../controllers/productsController");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), productController.uploadBulkProducts);

router.get("/products", productController.getProducts);
router.get("/products/:productId", productController.getProductsById);
router.get("/products/search", productController.searchProducts);
router.get("/designerSearch", productController.searchProductsByDesigner);
router.get("/latestProducts", productController.getLatestProducts);
router.get(
  "/subCategory/:subCategoryId",
  productController.getProductsBySubCategory
);
router.get(
  "/products/:productId/variants/:color",
  productController.getProductVariantByColor
);
module.exports = router;
