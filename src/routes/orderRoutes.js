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
  "/total-orders-by-designers",
  orderController.getTotalOrdersByDesigners
);
router.get("/total-sales", orderController.getTotalSales);

router.get(
  "/return-requests/:designerRef",
  orderController.getReturnRequestsByDesigner
);

router.get(
  "/total-orders/designer/:designerId",
  orderController.getTotalOrdersForDesigner
);

// Get total sales for a specific designer by ID
router.get(
  "/total-sales/designer/:designerId",
  orderController.getTotalSalesForDesigner
);

module.exports = router;
