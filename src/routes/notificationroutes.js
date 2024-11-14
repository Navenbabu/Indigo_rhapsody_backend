const express = require("express");
const router = express.Router();
const {
  createOrderNotification,
  getAllNotifications,
  getNotificationByDesigner,
  createReturnNotification,
  updateFcmToken,
  getLatestBroadcastNotification,
  getAllBroadcastNotifications,
  sendNotificationToAllUsers,
} = require("../controllers/notificationController");

router.put("/update-fcm-token", updateFcmToken);

// Route to create a new order notification
router.post("/create-order-notification", createOrderNotification);
router.get("/broadcast/latest", getLatestBroadcastNotification);

// Route to get all broadcast notifications
router.get("/broadcast/all", getAllBroadcastNotifications);
// Route to get all notifications
router.get("/all", getAllNotifications);

// Route to get notifications by designer
router.get("/designer/:designerId", getNotificationByDesigner);

// Route to create a new return notification
router.post("/create-return-notification", createReturnNotification);

router.post("/send-notification-to-all", sendNotificationToAllUsers);

module.exports = router;
