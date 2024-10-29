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

exports.toggleLikeVideo = async (req, res) => {
  try {
    const { videoId } = req.params; // Get the video ID from the request parameters
    const { userId } = req.body; // Get the user ID from the request body

    if (!videoId || !userId) {
      return res
        .status(400)
        .json({ message: "Video ID and User ID are required" });
    }

    // Find the video by ID
    const video = await ContentVideo.findById(videoId);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has already liked the video
    const userIndex = video.likedBy.indexOf(userId);

    if (userIndex === -1) {
      // User has not liked the video, so add the like
      video.likedBy.push(userId);
      video.no_of_likes += 1;
    } else {
      // User has already liked the video, so remove the like
      video.likedBy.splice(userIndex, 1);
      video.no_of_likes -= 1;
    }

    // Save the updated video in the database
    await video.save();

    res.status(200).json({
      message:
        userIndex === -1
          ? "Video liked successfully"
          : "Video unliked successfully",
      video,
    });
  } catch (error) {
    console.error("Error toggling like status:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error:", error: error.message });
  }
};
