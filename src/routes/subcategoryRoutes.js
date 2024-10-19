const express = require("express");
const router = express.Router();
const subcategoryController = require("../controllers/subcategoryController");

router.post("/", subcategoryController.createSubCategory);

router.post("/update", subcategoryController.updateSubCategory);

router.get("/subcategories", subcategoryController.getSubCategories);

router.get("/getSubCategory/:id", subcategoryController.getSubCategoryById);

router.get(
  "/getSubCategoriesByCategory/:categoryId",
  subcategoryController.getSubCategoriesByCategoryId
);

module.exports = router;
