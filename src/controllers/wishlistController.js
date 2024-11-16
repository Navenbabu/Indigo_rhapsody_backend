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

    const existingItem = await Wishlist.findOne({ userId, productId });

    if (existingItem) {
      // If the product already exists, remove it from the wishlist
      await Wishlist.deleteOne({ _id: existingItem._id });
      return res.status(200).json({ message: "Product removed from wishlist" });
    } else {
      // If the product doesn't exist, add it to the wishlist
      const newWishlistItem = new Wishlist({ userId, productId });
      await newWishlistItem.save();
      return res
        .status(201)
        .json({ message: "Product added to wishlist", productId });
    }
  } catch (error) {
    res.status(500).json({ error: "Error toggling wishlist item" });
  }
};

module.exports = {
  getWishlistByUserId,
  toggleWishlistItem,
};
