const Wishlist = require("../models/wishlistModel");
const Product = require("../models/productModels");

// Get wishlist products for a specific user
const getWishlistByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    const wishlist = await Wishlist.find({ userId })
      .populate("productId")
      .exec();

    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ error: "Error fetching wishlist" });
  }
};

// Toggle add/remove product from the wishlist
const toggleWishlistItem = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if the product is already in the user's wishlist
    const existingItem = await Wishlist.findOne({ userId, productId });

    if (existingItem) {
      // Remove the product from the wishlist
      await Wishlist.deleteOne({ _id: existingItem._id });

      // Remove the user ID from the product's wishlistedBy array
      if (product.wishlistedBy.includes(userId)) {
        product.wishlistedBy = product.wishlistedBy.filter(
          (id) => id !== userId
        );
        await product.save();
      }

      return res.status(200).json({ message: "Product removed from wishlist" });
    } else {
      // Add the product to the wishlist
      const newWishlistItem = new Wishlist({ userId, productId });
      await newWishlistItem.save();

      // Add the user ID to the product's wishlistedBy array if not already present
      if (!product.wishlistedBy.includes(userId)) {
        product.wishlistedBy.push(userId);
        await product.save();
      }

      return res
        .status(201)
        .json({ message: "Product added to wishlist", productId });
    }
  } catch (error) {
    console.error("Error toggling wishlist item:", error);
    res.status(500).json({ error: "Error toggling wishlist item" });
  }
};

module.exports = {
  getWishlistByUserId,
  toggleWishlistItem,
};
