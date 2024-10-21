const express = require("express");
const router = express.Router();
const filterController = require("../controllers/fitFilterController");
const colorFilterController = require("../controllers/colorFilterController");

router.post("/createFitFilters", filterController.createFilter);
router.get("/getFitFilters", filterController.getFilters);
router.put("/updateFitFilters/:filterId", filterController.updateFilter);
router.delete("/deleteFitFilters/:filterId", filterController.deleteFilter);

router.post("/createColorFilter", colorFilterController.createColorFilter);

// Route to get all color filters
router.get("/getColorFilters", colorFilterController.getColorFilters);

// Route to update a color filter by ID
router.put(
  "/updateColorFilter/:filterId",
  colorFilterController.updateColorFilter
);

// Route to delete a color filter by ID
router.delete(
  "/deleteColorFilter/:filterId",
  colorFilterController.deleteColorFilter
);

module.exports = router;
