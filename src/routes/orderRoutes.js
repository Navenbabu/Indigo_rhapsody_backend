const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const orderController = require("../controllers/orderController");

router.post("/", orderController.createOrder);

module.exports = router;