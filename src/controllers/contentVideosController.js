const ContentVideo = require("../models/contentVIdeosModel");

// Create a new video
exports.createVideo = async (req, res) => {
  try {
    const { userId, creatorId, videoUrl } = req.body;

    if (!userId || !creatorId || !videoUrl) {
      return res
        .status(400)
        .json({ message: "User ID, Creator ID, and Video URL are required." });
    }

    const newVideo = new ContentVideo({
      userId,
      creatorId,
      videoUrl,
    });

    await newVideo.save();
    res.status(201).json({
      message: "Video created successfully",
      video: newVideo,
    });
  } catch (error) {
    console.error("Error creating video:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all videos (approved only)
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await ContentVideo.find({ is_approved: true }).populate(
      "userId creatorId",
      "displayName email"
    );

    if (!videos.length) {
      return res.status(404).json({ message: "No videos found." });
    }

    res.status(200).json({ videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get videos by user ID
exports.getVideosByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const videos = await ContentVideo.find({ userId }).populate(
      "userId creatorId",
      "displayName email"
    );

    if (!videos.length) {
      return res
        .status(404)
        .json({ message: "No videos found for this user." });
    }

    res.status(200).json({ videos });
  } catch (error) {
    console.error("Error fetching user videos:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Get a single video by ID
exports.getVideoById = async (req, res) => {
  try {
    const { videoId } = req.params;

    const video = await ContentVideo.findById(videoId).populate(
      "userId creatorId",
      "displayName email"
    );

    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }

    res.status(200).json({ video });
  } catch (error) {
    console.error("Error fetching video:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Delete a video by ID
exports.deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    const deletedVideo = await ContentVideo.findByIdAndDelete(videoId);

    if (!deletedVideo) {
      return res.status(404).json({ message: "Video not found." });
    }

    res.status(200).json({
      message: "Video deleted successfully",
      video: deletedVideo,
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
