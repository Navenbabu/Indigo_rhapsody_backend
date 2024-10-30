const express = require("express");
const router = express.Router();
const {
  getWishlistByUserId,
  toggleWishlistItem,
} = require("../controllers/wishlistController");

// Route to get wishlist products by user ID
router.get("/:userId", getWishlistByUserId);

// Route to toggle wishlist item (add/remove)
router.post("/toggle", toggleWishlistItem);

module.exports = router;
