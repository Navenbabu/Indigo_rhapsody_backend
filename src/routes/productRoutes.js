const express = require("express");
const router = express.Router();
const cors = require("cors");
const productController = require("../controllers/productsController");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
router.use(cors());
router.options("*", cors());

function bypassMulter(req, res, next) {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
}

router.post(
  "/",

  productController.uploadBulkProducts
);
router.post(
  "/updateId",

  productController.updateVariantStock
);
router.post("/createProduct", productController.createProduct);

router.get("/products", productController.getProducts);
router.get("/products/:productId", productController.getProductsById);
router.get("/products/search", productController.searchProductsAdvanced);
router.get("/designerSearch", productController.searchProductsByDesigner);
router.get("/latestProducts", productController.getLatestProducts);
router.put("/products/:id", productController.updateProduct);
router.get("/total-count", productController.getTotalProductCount);
router.get(
  "/subCategory/:subCategoryId",
  productController.getProductsBySubCategory
);
router.get(
  "/products/:productId/variants/:color",
  productController.getProductVariantByColor
);
router.get(
  "/getProductsByDesigner/:designerRef",
  productController.getProductsByDesigner
);

router.get(
  "/total-products/designer/:designerId",
  productController.getTotalProductsByDesigner
);
module.exports = router;
