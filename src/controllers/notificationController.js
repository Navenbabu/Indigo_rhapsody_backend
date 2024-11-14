const Notifications = require("../models/notificationsModel");

// Create a new order notification

exports.createNotification = async ({
  userId,
  designeref,
  message,
  orderId,
}) => {
  try {
    const newNotification = new Notifications({
      userId,
      designeref,
      message,
      orderId,
    });

    await newNotification.save();
    return { success: true, data: newNotification };
  } catch (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
};
exports.createOrderNotification = async (req, res) => {
  try {
    const { userId, designeref, message, orderId } = req.body;

    const newNotification = new Notifications({
      userId,
      designeref,
      message,
      orderId,
    });

    await newNotification.save();

    res.status(201).json({
      success: true,
      message: "Order notification created successfully",
      data: newNotification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating order notification",
      error: error.message,
    });
  }
};

// Get all notifications
exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notifications.find().populate(
      "userId designeref orderId"
    );

    res.status(200).json({
      success: true,
      message: "All notifications retrieved successfully",
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving notifications",
      error: error.message,
    });
  }
};

// Get notifications by designer
exports.getNotificationByDesigner = async (req, res) => {
  try {
    const { designerId } = req.params;
    const notifications = await Notifications.find({
      designeref: designerId,
    }).populate("userId orderId");

    if (!notifications.length) {
      return res.status(404).json({
        success: false,
        message: "No notifications found for this designer",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving notifications for designer",
      error: error.message,
    });
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "User ID and FCM token are required",
      });
    }

    // Update user's FCM token
    const user = await User.findByIdAndUpdate(
      userId,
      { fcmToken },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "FCM token updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating FCM token",
      error: error.message,
    });
  }
};

// Create a new return notification
exports.createReturnNotification = async (req, res) => {
  try {
    const { userId, designeref, message, returnId } = req.body;

    const newNotification = new Notifications({
      userId,
      designeref,
      message,
      returnId,
    });

    await newNotification.save();

    res.status(201).json({
      success: true,
      message: "Return notification created successfully",
      data: newNotification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating return notification",
      error: error.message,
    });
  }
};
