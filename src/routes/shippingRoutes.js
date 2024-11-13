const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const shippingController = require("../controllers/shippingController");

router.post("/createOrder", shippingController.ship);
router.post("/generate-invoice", shippingController.generateInvoice);
router.post("/generate-manifest", shippingController.generateManifest);
router.get(
  "/designer/:designerRef",
  shippingController.getShippingsByDesignerRef
);
router.post("/createReturn", shippingController.createReturnRequestForDesigner);

module.exports = router;
