const mongoose = require("mongoose");
const ColorFilter = require("../models/colorFilterModel");

// Create a new color filter
const createColorFilter = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Color filter name is required" });
    }

    const newColorFilter = await ColorFilter.create({ name });

    res.status(201).json({
      message: "Color filter created successfully",
      newColorFilter,
    });
  } catch (error) {
    console.error("Error creating color filter:", error);
    res.status(500).json({ message: "Error creating color filter", error });
  }
};

// Get all color filters
const getColorFilters = async (req, res) => {
  try {
    const colorFilters = await ColorFilter.find();
    res.status(200).json({ colorFilters });
  } catch (error) {
    console.error("Error fetching color filters:", error);
    res.status(500).json({ message: "Error fetching color filters", error });
  }
};

// Update a color filter by ID
const updateColorFilter = async (req, res) => {
  try {
    const { filterId } = req.params;
    const { name } = req.body;

    if (!mongoose.isValidObjectId(filterId)) {
      return res.status(400).json({ message: "Invalid filter ID" });
    }

    const updatedFilter = await ColorFilter.findByIdAndUpdate(
      filterId,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedFilter) {
      return res.status(404).json({ message: "Color filter not found" });
    }

    res.status(200).json({
      message: "Color filter updated successfully",
      updatedFilter,
    });
  } catch (error) {
    console.error("Error updating color filter:", error);
    res.status(500).json({ message: "Error updating color filter", error });
  }
};

// Delete a color filter by ID
const deleteColorFilter = async (req, res) => {
  try {
    const { filterId } = req.params;

    if (!mongoose.isValidObjectId(filterId)) {
      return res.status(400).json({ message: "Invalid filter ID" });
    }

    const deletedFilter = await ColorFilter.findByIdAndDelete(filterId);

    if (!deletedFilter) {
      return res.status(404).json({ message: "Color filter not found" });
    }

    res.status(200).json({ message: "Color filter deleted successfully" });
  } catch (error) {
    console.error("Error deleting color filter:", error);
    res.status(500).json({ message: "Error deleting color filter", error });
  }
};

module.exports = {
  createColorFilter,
  getColorFilters,
  updateColorFilter,
  deleteColorFilter,
};
