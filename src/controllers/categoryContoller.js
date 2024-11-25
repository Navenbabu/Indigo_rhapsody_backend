const mongoose = require("mongoose");
const Category = require("../models/categoryModel"); // Import the Category model
const { bucket } = require("./../service/firebaseServices"); // Firebase storage configuration

// 1. Create a new Category
exports.createCategory = async (req, res) => {
  try {
    const { name, imageUrl } = req.body;

    // Validate the input
    if (!name || !imageUrl) {
      return res
        .status(400)
        .json({ message: "Name and image URL are required" });
    }

    // Check for duplicate category
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({
        message: "A category with this name already exists",
      });
    }

    // Create the new category
    const newCategory = new Category({
      name: name.trim(),
      image: imageUrl,
    });

    await newCategory.save();

    return res.status(201).json({
      message: "Category created successfully",
      newCategory,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error creating category", error: error.message });
  }
};

// 2. Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    if (!categories || categories.length === 0) {
      return res.status(404).json({ message: "No categories found" });
    }
    return res.status(200).json({ categories });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching categories", error });
  }
};

// 3. Get a single category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ category });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching category", error });
  }
};

// 4. Delete a category by ID
exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndDelete(categoryId);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // If you want to delete the image from Firebase Storage as well
    const fileName = category.image.split("/").pop();
    const file = bucket.file(`categories/${fileName}`);
    await file.delete();

    return res
      .status(200)
      .json({ message: "Category deleted successfully", category });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting category", error });
  }
};
exports.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name } = req.body;

    // Find the category to update
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Initialize imageUrl with the existing image
    let imageUrl = category.image;

    // Handle new image upload if a file is provided
    if (req.file) {
      try {
        // Delete the old image from Firebase Storage if it exists
        if (category.image) {
          const fileName = category.image.split("/").pop();
          const oldFile = bucket.file(`categories/${fileName}`);
          await oldFile.delete();
        }

        // Upload the new image to Firebase Storage
        const file = req.file;
        const blob = bucket.file(
          `categories/${Date.now()}_${file.originalname}`
        );
        const blobStream = blob.createWriteStream({
          metadata: {
            contentType: file.mimetype,
          },
        });

        // Upload the image and save the new URL
        const uploadResult = await new Promise((resolve, reject) => {
          blobStream.on("finish", async () => {
            const firebaseUrl = await blob.getSignedUrl({
              action: "read",
              expires: "03-09-2491", // Long expiry date
            });
            resolve(firebaseUrl[0]);
          });
          blobStream.on("error", (error) => reject(error));
          blobStream.end(req.file.buffer);
        });

        imageUrl = uploadResult;
      } catch (err) {
        console.error("Error uploading image:", err);
        return res
          .status(500)
          .json({ message: "Image upload failed", error: err });
      }
    }

    // Update the fields that are provided
    category.name = name || category.name;
    category.image = imageUrl;

    await category.save();

    return res
      .status(200)
      .json({ message: "Category updated successfully", category });
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({ message: "Error updating category", error });
  }
};
