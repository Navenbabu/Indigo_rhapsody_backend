const mongoose = require("mongoose");
const SubCategory = require("../models/subcategoryModel"); // Import the SubCategory model
const Category = require("../models/categoryModel"); // Import the Category model for reference checks
const { bucket } = require("./../service/firebaseServices"); // Firebase storage configuration

// 1. Create a new SubCategory
exports.createSubCategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    // Check if the categoryId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    // Verify if the category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Handle image upload to Firebase Storage (if image is provided)
    let imageUrl = "";
    if (req.file) {
      const file = req.file;
      const blob = bucket.file(
        `subcategories/${Date.now()}_${file.originalname}`
      );
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      blobStream.on("finish", async () => {
        const firebaseUrl = await blob.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });
        imageUrl = firebaseUrl[0];

        // Create the new subcategory after the image is uploaded
        const newSubCategory = new SubCategory({
          name,
          categoryId,
          image: imageUrl,
        });

        await newSubCategory.save();
        return res.status(201).json({
          message: "SubCategory created successfully",
          newSubCategory,
        });
      });

      blobStream.end(req.file.buffer);
    } else {
      return res.status(400).json({ message: "Image is required" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error creating subcategory", error });
  }
};

// 2. Get all SubCategories
exports.getSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().populate(
      "categoryId",
      "name"
    ); // Populate category name
    if (!subCategories || subCategories.length === 0) {
      return res.status(404).json({ message: "No subcategories found" });
    }
    return res.status(200).json({ subCategories });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching subcategories", error });
  }
};

// 3. Get a single SubCategory by ID
exports.getSubCategoryById = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const subCategory = await SubCategory.findById(subCategoryId).populate(
      "categoryId",
      "name"
    );

    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    return res.status(200).json({ subCategory });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching subcategory", error });
  }
};

// 4. Update SubCategory
exports.updateSubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const { name, categoryId } = req.body;

    // Check if the referenced Category exists
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
    }

    // Handle image upload if a new image is provided
    let imageUrl = req.body.image; // Default to existing image URL if no new image
    if (req.file) {
      const file = req.file;
      const blob = bucket.file(
        `subcategories/${Date.now()}_${file.originalname}`
      );
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      blobStream.on("finish", async () => {
        const firebaseUrl = await blob.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });
        imageUrl = firebaseUrl[0];
      });

      blobStream.end(req.file.buffer);
    }

    // Update the SubCategory
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      subCategoryId,
      { name, categoryId, image: imageUrl },
      { new: true }
    );

    if (!updatedSubCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    return res.status(200).json({
      message: "SubCategory updated successfully",
      updatedSubCategory,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating subcategory", error });
  }
};

// 5. Delete SubCategory by ID
exports.deleteSubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const subCategory = await SubCategory.findByIdAndDelete(subCategoryId);

    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    // If you want to delete the image from Firebase Storage as well
    const fileName = subCategory.image.split("/").pop();
    const file = bucket.file(`subcategories/${fileName}`);
    await file.delete();

    return res
      .status(200)
      .json({ message: "SubCategory deleted successfully", subCategory });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error deleting subcategory", error });
  }
};
