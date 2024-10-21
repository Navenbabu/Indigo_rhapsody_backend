const express = require("express");
const router = express.Router();
const contentVideoController = require("../controllers/contentVideosController");

router.post("/", contentVideoController.uploadVideo);
router.get("/", contentVideoController.getVideos);
router.delete("/deleteVideo/:videoId", contentVideoController.deleteVideo);
router.get("/getVideo/:videoId", contentVideoController.getVideosByID);
module.exports = router;
