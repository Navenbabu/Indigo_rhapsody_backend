const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const orderController = require("../controllers/orderController");

router.post("/", orderController.createOrder);
router.get("/getOrders/:userId", orderController.getOrders);
router.get("/getAllOrders", orderController.getAllOrders);
router.get("/designer/:designerRef", orderController.getOrdersByDesignerRef);
router.get("/order/:orderId", orderController.getOrderById);
router.post("/return-request", orderController.createReturnRequest);

router.get(
  "/return-requests/:designerRef",
  orderController.getReturnRequestsByDesigner
);

module.exports = router;
