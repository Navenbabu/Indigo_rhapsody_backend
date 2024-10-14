const express = require("express");
const router = express.Router();
const subcategoryController = require("../controllers/subcategoryController");

router.post("/", subcategoryController.createSubCategory);

module.exports = router;
