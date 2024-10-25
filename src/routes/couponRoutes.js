const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");

router.post("/", couponController.createCoupon);
router.get("/", couponController.getAllCoupons);
router.get("/:couponId", couponController.getCouponById);
router.put("/:couponId", couponController.updateCoupon);
router.delete("/:couponId", couponController.deleteCoupon);
router.post("/applyCoupon", couponController.applyCouponToCart);

module.exports = router;
