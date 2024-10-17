const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const shippingController = require("../controllers/shippingController");

router.post("/createOrder", shippingController.ship);

module.exports = router;
