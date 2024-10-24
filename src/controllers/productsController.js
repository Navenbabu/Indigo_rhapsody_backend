const mongoose = require("mongoose");
const Product = require("../models/productModels");
const Category = require("../models/categoryModel");
const SubCategory = require("../models/subcategoryModel");
const { bucket } = require("../service/firebaseServices"); // Firebase storage configuration
const axios = require("axios"); // To fetch images from URLs
const xlsx = require("xlsx"); // Add this at the top of your file

const uploadImageFromURL = async (imageUrl, filename) => {
  try {
    const response = await axios({
      url: imageUrl,
      responseType: "stream", // Fetch the image as a stream
    });

    const blob = bucket.file(`products/${Date.now()}_${filename}`);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: response.headers["content-type"],
      },
    });

    // Pipe the image stream to Firebase Storage
    response.data.pipe(blobStream);

    return new Promise((resolve, reject) => {
      blobStream.on("finish", async () => {
        const firebaseUrl = await blob.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });
        resolve(firebaseUrl[0]);
      });

      blobStream.on("error", (error) => reject(error));
    });
  } catch (error) {
    throw new Error(`Failed to upload image from URL: ${error.message}`);
  }
};

exports.searchProductsByDesigner = async (req, res) => {
  try {
    const { designerRef, searchTerm, limit } = req.query;

    if (!designerRef) {
      return res
        .status(400)
        .json({ message: "Designer reference is required" });
    }

    const query = { designerRef };

    // Add search term if provided
    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i"); // Case-insensitive partial match
      query.productName = { $regex: regex }; // Match product name based on searchTerm
    }

    // Limit the number of results, defaulting to 10
    const productLimit = parseInt(limit) || 10;

    // Query the products based on designerRef and optional searchTerm
    const products = await Product.find(query)
      .populate("category", "name") // Populate category name
      .populate("subCategory", "name") // Populate subCategory name
      .limit(productLimit);

    if (products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this designer" });
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error searching products by designer:", error);
    return res.status(500).json({
      message: "Error searching products by designer",
      error: error.message,
    });
  }
};

exports.uploadSingleProduct = async (req, res) => {
  try {
    const {
      category,
      subCategory,
      productName,
      price,
      sku,
      fit,
      description,
      imageUrls,
    } = req.body;

    // Find or create Category and Subcategory
    const categoryDoc = await Category.findOneAndUpdate(
      { name: category },
      { name: category },
      { upsert: true, new: true }
    );
    const subCategoryDoc = await SubCategory.findOneAndUpdate(
      { name: subCategory },
      { name: subCategory, category: categoryDoc._id },
      { upsert: true, new: true }
    );

    let imageList = [];
    for (const url of imageUrls) {
      const filename = url.split("/").pop(); // Get the filename from the URL
      const firebaseUrl = await uploadImageFromURL(url, filename);
      imageList.push(firebaseUrl);
    }

    const product = new Product({
      productName,
      price,
      sku,
      description,
      category: categoryDoc._id,
      subCategory: subCategoryDoc._id,
      fit,
      imageList,
    });

    await product.save();
    return res
      .status(201)
      .json({ message: "Product created successfully", product });
  } catch (error) {
    return res.status(500).json({ message: "Error creating product", error });
  }
};

exports.uploadBulkProducts = async (req, res) => {
  try {
    const file = req.file; // Multer handles file upload

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    // Read the Excel file from buffer
    const workbook = xlsx.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const products = {};

    // Iterate through each row in Excel
    for (const row of sheetData) {
      const categoryDoc = await Category.findOneAndUpdate(
        { name: row.category },
        { name: row.category },
        { upsert: true, new: true }
      );

      const subCategoryDoc = await SubCategory.findOneAndUpdate(
        { name: row.subCategory },
        { name: row.subCategory, category: categoryDoc._id },
        { upsert: true, new: true }
      );

      const productName = row.productName.trim().toLowerCase();

      // Initialize product if it doesn't already exist
      if (!products[productName]) {
        let imageList = [];
        let coverImageFirebaseUrl = "";

        if (row.ImageList) {
          const imageUrls = row.ImageList.split(",");
          for (let index = 0; index < imageUrls.length; index++) {
            const url = imageUrls[index].trim();
            try {
              const filename = url.split("/").pop();
              const firebaseUrl = await uploadImageFromURL(url, filename);
              imageList.push(firebaseUrl);

              // Set the first image as coverImage
              if (index === 0) {
                coverImageFirebaseUrl = firebaseUrl;
              }
            } catch (error) {
              console.error(`Failed to upload image: ${error.message}`);
            }
          }
        }

        products[productName] = {
          productName: row.productName,
          description: row.description,
          price: row.price,
          sku: row.sku,
          fit: row.fit,
          fabric: row.fabric,
          material: row.material,
          category: categoryDoc._id,
          subCategory: subCategoryDoc._id,
          designerRef: row.designerRef,
          createdDate: new Date(),
          coverImage: coverImageFirebaseUrl,
          variants: [],
        };
      }

      // Handle product variant
      let variant = products[productName].variants.find(
        (v) => v.color === row.color
      );

      if (!variant) {
        variant = {
          color: row.color,
          imageList: [], // We'll fill this below
          sizes: [],
        };
        products[productName].variants.push(variant);
      }

      // Use the imageList from the product for the variant
      // Assuming all variants share the same images
      if (row.ImageList) {
        const imageUrls = row.ImageList.split(",");
        for (let index = 0; index < imageUrls.length; index++) {
          const url = imageUrls[index].trim();
          try {
            const filename = url.split("/").pop();
            const firebaseUrl = await uploadImageFromURL(url, filename);

            if (!variant.imageList.includes(firebaseUrl)) {
              variant.imageList.push(firebaseUrl); // Avoid duplicates
            }

            // Set the coverImage if it's the first image
            if (index === 0 && !products[productName].coverImage) {
              products[productName].coverImage = firebaseUrl;
            }
          } catch (error) {
            console.error(`Failed to upload image: ${error.message}`);
          }
        }
      }

      // Add size to the variant
      if (!variant.sizes.find((size) => size.size === row.size)) {
        variant.sizes.push({
          size: row.size,
          price: row.sizePrice || row.price, // Handle size-specific price
          stock: row.sizeStock || row.stock || 0, // Handle size-specific stock
        });
      }
    }

    // Upsert (create or update) products in the database
    for (const productName in products) {
      const productData = products[productName];
      await Product.findOneAndUpdate(
        { productName: productData.productName },
        { $set: productData },
        { upsert: true, new: true }
      );
    }

    return res.status(201).json({ message: "Products uploaded successfully" });
  } catch (error) {
    console.error("Error uploading products:", error.message);
    return res.status(500).json({
      message: "Error uploading products",
      error: error.message,
    });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { minPrice, maxPrice, sort, color, fit, category, subCategory } =
      req.query;

    // Construct the query object based on the filters
    let query = {};

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice); // Price greater than or equal to minPrice
      if (maxPrice) query.price.$lte = parseFloat(maxPrice); // Price less than or equal to maxPrice
    }

    // Filter by color (inside variants)
    if (color) {
      query["variants.color"] = color;
    }

    // Filter by fit
    if (fit) {
      query.fit = fit;
    }

    // Filter by category
    if (category) {
      const categoryDoc = await Category.findOne({ name: category });
      if (categoryDoc) {
        query.category = categoryDoc._id; // Use _id from the category document
      } else {
        return res.status(404).json({ message: "Category not found" });
      }
    }

    // Filter by subCategory
    if (subCategory) {
      const subCategoryDoc = await SubCategory.findOne({ name: subCategory });
      if (subCategoryDoc) {
        query.subCategory = subCategoryDoc._id; // Use _id from the subcategory document
      } else {
        return res.status(404).json({ message: "SubCategory not found" });
      }
    }

    // Set up sorting by price (low to high or high to low)
    let sortQuery = {};
    if (sort === "lowToHigh") {
      sortQuery.price = 1; // Ascending
    } else if (sort === "highToLow") {
      sortQuery.price = -1; // Descending
    }

    // Execute the query with filters and sorting
    const products = await Product.find(query)
      .populate("category", "name") // Populate category name
      .populate("subCategory", "name") // Populate subCategory name
      .sort(sortQuery); // Apply sorting if needed

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    return res.status(200).json({ products });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching products", error: error.message });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { searchTerm, limit } = req.query;

    if (!searchTerm) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const regex = new RegExp(searchTerm, "i"); // Case-insensitive partial match

    // Find products matching the search term in the product name
    const products = await Product.find({ productName: { $regex: regex } })
      .populate("category", "name") // Populate category name
      .populate("subCategory", "name") // Populate subCategory name
      .limit(parseInt(limit) || 10); // Limit the results (default 10)

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error searching products:", error);
    return res.status(500).json({
      message: "Error searching products",
      error: error.message,
    });
  }
};

exports.getLatestProducts = async (req, res) => {
  try {
    const { limit } = req.query;

    // Default limit is 10 if not provided
    const productLimit = parseInt(limit) || 10;

    // Fetch latest products sorted by createdDate in descending order
    const latestProducts = await Product.find()
      .sort({ createdDate: -1 }) // Sort by latest first
      .limit(productLimit) // Limit the results
      .populate("category", "name") // Populate category name
      .populate("subCategory", "name"); // Populate subcategory name

    if (latestProducts.length === 0) {
      return res.status(404).json({ message: "No latest products found" });
    }

    return res.status(200).json({ products: latestProducts });
  } catch (error) {
    console.error("Error fetching latest products:", error);
    return res.status(500).json({
      message: "Error fetching latest products",
      error: error.message,
    });
  }
};

exports.getProductsById = async (req, res) => {
  try {
    const { productId } = req.params;
    const { color } = req.query; // Accept color as a query parameter

    // Validate the productId format
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // Query the product by ID
    const product = await Product.findById(productId)
      .populate("category", "name")
      .populate("subCategory", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get a list of available colors
    const availableColors = product.variants.map((v) => v.color);

    // If color is specified, find the variant for that color
    let selectedVariant = null;
    if (color) {
      selectedVariant = product.variants.find(
        (v) => v.color.toLowerCase() === color.toLowerCase()
      );

      if (!selectedVariant) {
        return res
          .status(404)
          .json({ message: "Variant not found for this color" });
      }
    } else {
      // If no color is specified, you can choose to return the first variant
      selectedVariant = product.variants[0];
    }

    return res.status(200).json({
      productId: product._id,
      productName: product.productName,
      description: product.description,
      price: product.price,
      sku: product.sku,
      category: product.category,
      subCategory: product.subCategory,
      fit: product.fit,
      material: product.material,
      fabric: product.fabric,
      designerRef: product.designerRef,
      coverImage: product.coverImage,
      availableColors: availableColors,
      variant: selectedVariant,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      message: "Error fetching product",
      error: error.message,
    });
  }
};

exports.getProductsBySubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const { fit, color, minPrice, maxPrice, sortBy, sortOrder } = req.query;

    // Validate the subCategoryId format
    if (!mongoose.isValidObjectId(subCategoryId)) {
      return res.status(400).json({ message: "Invalid subCategory ID" });
    }

    // Build the query object with optional filters
    const query = { subCategory: subCategoryId };

    // Handle comma-separated fit values
    if (fit) {
      const fitArray = fit.split(',').map(f => f.trim());
      query.fit = { $in: fitArray };
    }

    // Handle comma-separated color values
    if (color) {
      const colorArray = color.split(',').map(c => c.trim());
      query.color = { $in: colorArray };
    }

    // Add price filter only if minPrice or maxPrice is provided
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Determine sorting order (default to ascending if not provided)
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    // Fetch the products with the applied filters and sorting
    const products = await Product.find(query)
      .populate("category", "name") // Populate category name
      .populate("subCategory", "name") // Populate subcategory name
      .sort(sortOptions);

    if (products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this subcategory" });
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products by subcategory:", error);
    return res.status(500).json({
      message: "Error fetching products by subcategory",
      error: error.message,
    });
  }
};

exports.getProductVariantByColor = async (req, res) => {
  try {
    const { productId, color } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    if (!color) {
      return res.status(400).json({ message: "Color is required" });
    }

    // Find the product by ID
    const product = await Product.findById(productId)
      .populate("category", "name")
      .populate("subCategory", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find the variant with the specified color
    const variant = product.variants.find(
      (v) => v.color.toLowerCase() === color.toLowerCase()
    );

    if (!variant) {
      return res
        .status(404)
        .json({ message: "Variant not found for this color" });
    }

    // Return the variant along with the product details
    return res.status(200).json({
      productId: product._id,
      productName: product.productName,
      description: product.description,
      category: product.category,
      subCategory: product.subCategory,
      fit: product.fit,
      material: product.material,
      fabric: product.fabric,
      designerRef: product.designerRef,
      coverImage: product.coverImage,
      variant: variant,
    });
  } catch (error) {
    console.error("Error fetching product variant:", error);
    return res.status(500).json({
      message: "Error fetching product variant",
      error: error.message,
    });
  }
};

exports.getProductsByDesigner = async (req, res) => {
  try {
    const { designerRef } = req.params;

    // Validate if designerRef is provided
    if (!designerRef) {
      return res
        .status(400)
        .json({ message: "Designer reference is required" });
    }

    // Query products by designerRef
    const products = await Product.find({ designerRef })
      .populate("category", "name") // Populate category name
      .populate("subCategory", "name"); // Populate subcategory name

    // Check if products are found
    if (!products.length) {
      return res
        .status(404)
        .json({ message: "No products found for this designer" });
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products by designer:", error);
    return res.status(500).json({
      message: "Error fetching products by designer",
      error: error.message,
    });
  }
};
