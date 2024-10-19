const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const orderController = require("../controllers/orderController");

router.post("/", orderController.createOrder);
router.get("/getOrders/:userId", orderController.getOrders);
router.get("/getAllOrders", orderController.getAllOrders);
router.get("/designer/:designerRef", orderController.getOrdersByDesignerRef);

module.exports = router;
