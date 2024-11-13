const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");

// Create a new video
router.post("/videos", videoController.createVideo);

// Get all videos for all users
router.get("/videos", videoController.getAllVideos);

// Get videos for a particular user
router.get("/videos/user/:userId", videoController.getVideosByUser);

router.get("/video-requests", videoController.getAllVideoRequests);

// Update video status by admin
router.put("/videos/:videoId/status", videoController.updateVideoStatus);

router.get("/videos/:videoId", videoController.getVideoById);

router.post("/video-creator", videoController.createVideoCreator);

// Admin approves or rejects video creator
router.put(
  "/video-creator/:videoId/approve",
  videoController.approveVideoCreator
);

// Create video (only for approved creators)
router.post("/videos", videoController.createVideo);
router.post("/:videoId/like", videoController.LikeVideo);

router.post("/video-creator/status", videoController.checkApprovalStatus);
router.post("/video-creator/upload", videoController.createOrUpdateVideo);
router.post("/videos/:videoId/like", videoController.toggleLikeVideo);

module.exports = router;
