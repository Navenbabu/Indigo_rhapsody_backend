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
exports.createProduct = async (req, res) => {
  try {
    const {
      productName,
      category, // This should be the category ID
      subCategory, // This should be the subcategory ID
      description,
      price,
      sku,
      fit,
      fabric,
      material,
      designerRef,
      variants, // Array of variant objects: { color, imageList, sizes: [{ size, price, stock }] }
    } = req.body;

    // Check if required fields are present
    if (!productName || !category || !price || !designerRef) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Look up the existing category by ID
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Look up the existing subcategory by ID
    let subCategoryDoc = null;
    if (subCategory) {
      subCategoryDoc = await SubCategory.findById(subCategory);
      if (!subCategoryDoc) {
        return res.status(404).json({ message: "SubCategory not found" });
      }
    }

    // Process each variant to upload images and generate image URLs
    const processedVariants = [];
    for (const variant of variants) {
      const { color, imageList, sizes } = variant;
      let uploadedImageUrls = [];

      // Upload each image for the variant and get the URLs
      if (imageList && imageList.length > 0) {
        for (const url of imageList) {
          const filename = url.split("/").pop();
          const firebaseUrl = await uploadImageFromURL(url, filename);
          uploadedImageUrls.push(firebaseUrl);
        }
      }

      // Create the processed variant object with the image URLs and sizes
      processedVariants.push({
        color,
        imageList: uploadedImageUrls,
        sizes: sizes.map((size) => ({
          size: size.size,
          price: size.price,
          stock: size.stock,
        })),
      });
    }

    // Create product
    const product = new Product({
      productName,
      category: categoryDoc._id,
      subCategory: subCategoryDoc ? subCategoryDoc._id : null,
      description,
      price,
      sku,
      fit,
      fabric,
      material,
      coverImage: processedVariants[0]?.imageList[0] || null, // Set cover image from the first variant's first image
      designerRef,
      createdDate: new Date(),
      variants: processedVariants,
    });

    // Save product to the database
    await product.save();

    res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    console.error("Error creating product:", error.message);
    res.status(500).json({
      message: "Error creating product",
      error: error.message,
    });
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
    console.log("uploadBulkProducts called");
    const { fileUrl, designerRef } = req.body;
    console.log("Received fileUrl:", fileUrl);
    console.log("Received designerRef:", designerRef);

    if (!fileUrl)
      return res.status(400).json({ message: "No file URL provided" });
    if (!designerRef)
      return res
        .status(400)
        .json({ message: "Designer reference is required" });

    console.log("Attempting to download file from fileUrl");

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    console.log("File downloaded successfully");

    const fileBuffer = Buffer.from(response.data, "binary");
    console.log("File buffer created");


    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    console.log("Workbook read successfully");

    const sheetName = workbook.SheetNames[0];
    console.log("Sheet name obtained:", sheetName);

    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log("Sheet data converted to JSON:", sheetData.length, "rows");

    const products = {};

  
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
          designerRef: designerRef, // Use designerRef from form data
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

exports.updateVariantStock = async (req, res) => {
  try {
    const { fileUrl } = req.body; // Multer handles file upload

    if (!fileUrl) {
      return res.status(400).json({ message: "No file URL provided" });
    }

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const fileBuffer = Buffer.from(response.data, "binary");
    // Read the Excel file from buffer
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    // Iterate through each row in Excel
    for (const row of sheetData) {
      const { productName, color, size, stock } = row;

      if (!productName || !color || !size || stock === undefined) {
        console.error(`Invalid data in row: ${JSON.stringify(row)}`);
        continue;
      }

      // Find the product by name (case-insensitive)
      const product = await Product.findOne({
        productName: new RegExp(`^${productName.trim()}$`, "i"),
      });

      if (!product) {
        console.error(`Product not found: ${productName}`);
        continue;
      }

      // Find the variant by color (case-insensitive)
      const variant = product.variants.find(
        (variant) =>
          variant.color.trim().toLowerCase() === color.trim().toLowerCase()
      );

      if (!variant) {
        console.error(
          `Variant with color ${color} not found for product ${productName}`
        );
        continue;
      }

      // Find the size within the variant (case-insensitive)
      const sizeEntry = variant.sizes.find(
        (variantSize) =>
          variantSize.size.trim().toLowerCase() === size.trim().toLowerCase()
      );

      if (!sizeEntry) {
        console.error(
          `Size ${size} not found for variant color ${color} in product ${productName}`
        );
        continue;
      }

      // Update the stock for the specified size
      sizeEntry.stock = stock;

      // Save the updated product
      await product.save();
    }

    return res
      .status(200)
      .json({ message: "Stock updated successfully for variants" });
  } catch (error) {
    console.error("Error updating variant stock:", error.message);
    return res.status(500).json({
      message: "Error updating variant stock",
      error: error.message,
    });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const {
      productName, // New filter to search by product name
      minPrice,
      maxPrice,
      sort,
      color,
      fit,
      category,
      subCategory,
    } = req.query;

    // Construct the query object based on the filters
    let query = {};

    // 1. Filter by product name (case-insensitive search)
    if (productName) {
      query.productName = { $regex: new RegExp(productName, "i") };
    }

    // 2. Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // 3. Filter by color (inside variants)
    if (color) {
      query["variants.color"] = { $regex: new RegExp(color, "i") };
    }

    // 4. Filter by fit
    if (fit) {
      query.fit = fit;
    }

    // 5. Filter by category
    if (category) {
      const categoryDoc = await Category.findOne({ name: category });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      } else {
        return res.status(404).json({ message: "Category not found" });
      }
    }

    // 6. Filter by subCategory
    if (subCategory) {
      const subCategoryDoc = await SubCategory.findOne({ name: subCategory });
      if (subCategoryDoc) {
        query.subCategory = subCategoryDoc._id;
      } else {
        return res.status(404).json({ message: "SubCategory not found" });
      }
    }

    // 7. Set up sorting by price (low to high or high to low)
    let sortQuery = {};
    if (sort === "lowToHigh") {
      sortQuery.price = 1; // Ascending
    } else if (sort === "highToLow") {
      sortQuery.price = -1; // Descending
    }

    // 8. Execute the query with filters and sorting
    const products = await Product.find(query)
      .populate("category", "name")
      .populate("subCategory", "name")
      .sort(sortQuery);

    // 9. Handle case where no products are found
    if (products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    // 10. Return the list of products
    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    return res.status(500).json({
      message: "Error fetching products",
      error: error.message,
    });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { searchTerm, limit } = req.query;

    if (!searchTerm) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const regex = new RegExp(searchTerm, "i"); // Case-insensitive search

    // Log the query parameters to debug input issues
    console.log("Search Term:", searchTerm);

    const products = await Product.find({ productName: { $regex: regex } })
      .populate("category", "name")
      .populate("subCategory", "name")
      .limit(parseInt(limit) || 10);

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error searching products:", error.message);
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

exports.getTotalProductCount = async (req, res) => {
  try {
    // Count the total number of documents in the Product collection
    const totalProducts = await Product.countDocuments();

    return res.status(200).json({ totalProducts });
  } catch (error) {
    console.error("Error fetching total product count:", error);
    return res.status(500).json({
      message: "Error fetching total product count",
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

    // Create availableColors array with color and imageList
    const availableColors = product.variants.map((variant) => ({
      color: variant.color,
      imageList: variant.imageList || [], // Ensure imageList is included
    }));

    // Find the selected variant based on the color parameter, if provided
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
      // Default to the first variant if no color is specified
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
      availableColors: availableColors, // Include color and imageList for each variant
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
      const fitArray = fit.split(",").map((f) => f.trim());
      query.fit = { $in: fitArray };
    }

    // Handle comma-separated color values
    if (color) {
      const colorArray = color.split(",").map((c) => c.trim());
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
    const {
      category,
      subCategory,
      color,
      fit,
      minPrice,
      maxPrice,
      sortBy,
      order,
    } = req.query;

    // Validate if designerRef is provided
    if (!designerRef) {
      return res
        .status(400)
        .json({ message: "Designer reference is required" });
    }

    // Build the query object dynamically
    const query = { designerRef };

    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;
    if (color) query.color = color;
    if (fit) query.fit = fit;

    // Handle optional price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Create the products query
    let productsQuery = Product.find(query)
      .populate("category", "name")
      .populate("subCategory", "name");

    // Handle optional sorting
    if (sortBy) {
      const sortOrder = order === "desc" ? -1 : 1; // Default order is ascending
      productsQuery = productsQuery.sort({ [sortBy]: sortOrder });
    }

    // Execute the query
    const products = await productsQuery;

    // Check if products were found
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

exports.searchProductsAdvanced = async (req, res) => {
  try {
    const {
      searchTerm, // Keyword search for product name
      category, // Filter by category name
      subCategory, // Filter by subcategory name
      minPrice, // Minimum price filter
      maxPrice, // Maximum price filter
      color, // Filter by product color
      fit, // Filter by product fit
      sortBy, // Sort by field (e.g., price, name)
      order = "asc", // Order of sorting (asc/desc)
      page = 1, // Pagination: page number
      limit = 10, // Pagination: items per page
    } = req.query;

    // Build dynamic query object
    let query = {};

    // 1. Search term for product name (case-insensitive)
    if (searchTerm) {
      query.productName = { $regex: new RegExp(searchTerm, "i") };
    }

    // 2. Filter by category (ensure valid ID query)
    if (category) {
      const categoryDoc = await Category.findOne({ name: category });
      if (!categoryDoc) {
        return res.status(404).json({ message: "Category not found" });
      }
      query.category = categoryDoc._id.toString(); // Store as a string to prevent ObjectId conflicts
    }

    // 3. Filter by subcategory
    if (subCategory) {
      const subCategoryDoc = await SubCategory.findOne({ name: subCategory });
      if (!subCategoryDoc) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      query.subCategory = subCategoryDoc._id.toString();
    }

    // 4. Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // 5. Filter by color within product variants
    if (color) {
      query["variants.color"] = { $regex: new RegExp(color, "i") };
    }

    // 6. Filter by fit
    if (fit) {
      query.fit = fit;
    }

    // 7. Set up sorting (default to ascending order)
    let sortQuery = {};
    if (sortBy) {
      sortQuery[sortBy] = order === "desc" ? -1 : 1;
    }

    // 8. Calculate pagination values
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 9. Execute the query with filters, sorting, and pagination
    const products = await Product.find(query)
      .populate("category", "name") // Populate category name
      .populate("subCategory", "name") // Populate subCategory name
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit));

    // 10. Handle case where no products are found
    if (products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    // 11. Return the list of products with pagination info
    const totalProducts = await Product.countDocuments(query);
    return res.status(200).json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
      },
    });
  } catch (error) {
    console.error("Error searching products:", error.message);
    return res.status(500).json({
      message: "Error searching products",
      error: error.message,
    });
  }
};

exports.getTotalProductsByDesigner = async (req, res) => {
  try {
    const { designerId } = req.params;

    // Validate designerId
    if (!designerId) {
      return res.status(400).json({ message: "Designer ID is required" });
    }

    // Count the number of products by designer ID
    const totalProducts = await Product.countDocuments({
      designerRef: designerId,
    });

    return res.status(200).json({
      totalProducts,
    });
  } catch (error) {
    console.error("Error fetching total products by designer:", error.message);
    return res.status(500).json({
      message: "Error fetching total products by designer",
      error: error.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Ensure the product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update the product with the provided fields
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    return res
      .status(200)
      .json({ message: "Product updated successfully", updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error.message);
    return res
      .status(500)
      .json({ message: "Failed to update product", error: error.message });
  }
};
