const express = require("express");
const router = express.Router();
const subcategoryController = require("../controllers/subcategoryController");

router.post("/", subcategoryController.createSubCategory);

router.post("/update", subcategoryController.updateSubCategory);

router.get("/subcategories", subcategoryController.getApprovedSubCategories);

router.get("/getSubCategory/:id", subcategoryController.getSubCategoryById);

router.patch(
  "/subcategory/:subCategoryId/approve",
  subcategoryController.approveSubCategory
);

// Get all subcategories
router.get("/subcategoriesall", subcategoryController.getAllSubCategories);

router.get(
  "/getSubCategoriesByCategory/:categoryId",
  subcategoryController.getSubCategoriesByCategoryId
);

router.delete(
  "/delete/:subCategoryId",
  subcategoryController.deleteSubCategory
);

module.exports = router;
