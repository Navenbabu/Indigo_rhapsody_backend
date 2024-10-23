const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

router.post("/", cartController.createCart);
router.put("/update", cartController.updateQuantity);

router.post("/addItem", cartController.addItemToCart);
router.post("/", cartController.deleteItem);
router.get("/getCart/:userId", cartController.getCartForUser);

module.exports = router;
