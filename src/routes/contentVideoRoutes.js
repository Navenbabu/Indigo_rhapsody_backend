const express = require("express");
const router = express.Router();
const videoController = require("../controllers/contentVideoController");

router.post("/videos", videoController.createVideo);
router.get("/videos", videoController.getAllVideos);
router.get("/videos/user/:userId", videoController.getVideosByUser);
router.get("/videos/:videoId", videoController.getVideoById);
router.delete("/videos/:videoId", videoController.deleteVideo);

module.exports = router;
