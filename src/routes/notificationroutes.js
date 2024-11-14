const express = require("express");
const router = express.Router();
const {
  createOrderNotification,
  getAllNotifications,
  getNotificationByDesigner,
  createReturnNotification,
  updateFcmToken,
} = require("../controllers/notificationController");

router.put("/update-fcm-token", updateFcmToken);

// Route to create a new order notification
router.post("/create-order-notification", createOrderNotification);

// Route to get all notifications
router.get("/all", getAllNotifications);

// Route to get notifications by designer
router.get("/designer/:designerId", getNotificationByDesigner);

// Route to create a new return notification
router.post("/create-return-notification", createReturnNotification);

module.exports = router;
