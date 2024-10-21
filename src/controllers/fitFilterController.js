const mongoose = require("mongoose");
const Filter = require("../models/fitFilterModel");

// Create a new filter
const createFilter = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Filter name is required" });
    }

    const newFilter = await Filter.create({ name });
    res.status(201).json({ message: "Filter created successfully", newFilter });
  } catch (error) {
    console.error("Error creating filter:", error);
    res.status(500).json({ message: "Error creating filter", error });
  }
};

// Get all filters
const getFilters = async (req, res) => {
  try {
    const filters = await Filter.find();
    res.status(200).json({ filters });
  } catch (error) {
    console.error("Error fetching filters:", error);
    res.status(500).json({ message: "Error fetching filters", error });
  }
};

// Update a filter by ID
const updateFilter = async (req, res) => {
  try {
    const { filterId } = req.params;
    const { name } = req.body;

    if (!mongoose.isValidObjectId(filterId)) {
      return res.status(400).json({ message: "Invalid filter ID" });
    }

    const updatedFilter = await Filter.findByIdAndUpdate(
      filterId,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedFilter) {
      return res.status(404).json({ message: "Filter not found" });
    }

    res.status(200).json({
      message: "Filter updated successfully",
      updatedFilter,
    });
  } catch (error) {
    console.error("Error updating filter:", error);
    res.status(500).json({ message: "Error updating filter", error });
  }
};

// Delete a filter by ID
const deleteFilter = async (req, res) => {
  try {
    const { filterId } = req.params;

    if (!mongoose.isValidObjectId(filterId)) {
      return res.status(400).json({ message: "Invalid filter ID" });
    }

    const deletedFilter = await Filter.findByIdAndDelete(filterId);

    if (!deletedFilter) {
      return res.status(404).json({ message: "Filter not found" });
    }

    res.status(200).json({ message: "Filter deleted successfully" });
  } catch (error) {
    console.error("Error deleting filter:", error);
    res.status(500).json({ message: "Error deleting filter", error });
  }
};

module.exports = {
  createFilter,
  getFilters,
  updateFilter,
  deleteFilter,
};
