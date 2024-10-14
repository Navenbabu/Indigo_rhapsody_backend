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

    // Read the Excel file from buffer (since using memoryStorage in Multer)
    const workbook = xlsx.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const products = {};

    // Iterate through each row in Excel
    for (const row of sheetData) {
      // Find or create Category and SubCategory
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

      // Create or aggregate product data
      const productName = row.productName.trim().toLowerCase();

      // Initialize or update the product in the products map
      if (!products[productName]) {
        products[productName] = {
          productName: row.productName,
          description: row.description,
          price: row.price,
          sku: row.sku,
          category: categoryDoc._id,
          subCategory: subCategoryDoc._id,
          fit: row.fit,
          productDetails: row.productDetails,
          material: row.material,
          is_customizable: row.is_customizable || false,
          fabric: row.fabric,
          is_sustainable: row.is_sustainable || false,
          in_stock: row.in_stock || true,
          designerRef: row.designerRef,
          createdDate: new Date(),
          stock: row.stock || 0,
          variants: [],
        };
      }

      // Prepare variants
      let variant = products[productName].variants.find(
        (v) => v.color === row.color
      );

      if (!variant) {
        variant = {
          color: row.color,
          imageList: [],
          sizes: [],
        };
        products[productName].variants.push(variant);
      }

      // Upload images for the color variant
      if (row.imageUrls) {
        const imageUrls = row.imageUrls.split(",");
        for (const url of imageUrls) {
          const filename = url.split("/").pop(); // Get the filename from the URL
          const firebaseUrl = await uploadImageFromURL(url, filename);
          if (!variant.imageList.includes(firebaseUrl)) {
            variant.imageList.push(firebaseUrl); // Avoid duplicates
          }
        }
      }

      // Add size, price, and stock to the variant (size variant handling)
      const sizeExists = variant.sizes.find((size) => size.size === row.size);
      if (!sizeExists) {
        variant.sizes.push({
          size: row.size,
          price: row.price,
          stock: row.stock || 0,
        });
      }
    }

    // Upsert (create or update) each product in the database
    for (const productName in products) {
      const productData = products[productName];

      // Find the product by name and update or create it
      await Product.findOneAndUpdate(
        { productName: productData.productName },
        { $set: productData },
        { upsert: true, new: true }
      );
    }

    return res.status(201).json({ message: "Products uploaded successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error uploading products", error: error.message });
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
