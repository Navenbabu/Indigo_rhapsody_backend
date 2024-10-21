const mongoose = require("mongoose");
const ContentVideo = require("../models/contentVIdeosModel");

// Upload a new video
const uploadVideo = async (req, res) => {
  try {
    const { userId, videoUrl } = req.body;

    if (!userId || !videoUrl) {
      return res
        .status(400)
        .json({ message: "User ID and video URL are required" });
    }

    const newVideo = new ContentVideo({
      userId,
      videoUrl,
    });

    await newVideo.save();
    res
      .status(201)
      .json({ message: "Video uploaded successfully", video: newVideo });
  } catch (error) {
    console.error("Error uploading video:", error);
    res
      .status(500)
      .json({ message: "Error uploading video", error: error.message });
  }
};

// Get all videos (with optional filters)
const getVideos = async (req, res) => {
  try {
    const { is_approved } = req.query;

    // Apply optional filter for approved videos
    const query = {};
    if (is_approved !== undefined) {
      query.is_approved = is_approved === "true";
    }

    const videos = await ContentVideo.find(query).populate(
      "userId",
      "displayName email"
    );

    if (videos.length === 0) {
      return res.status(404).json({ message: "No videos found" });
    }

    res.status(200).json({ videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res
      .status(500)
      .json({ message: "Error fetching videos", error: error.message });
  }
};

// Get video by ID
const getVideosByID = async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }

    const video = await ContentVideo.findById(videoId).populate(
      "userId",
      "displayName email"
    );

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.status(200).json({ video });
  } catch (error) {
    console.error("Error fetching video by ID:", error);
    res
      .status(500)
      .json({ message: "Error fetching video", error: error.message });
  }
};

// Delete a video by ID
const deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }

    const deletedVideo = await ContentVideo.findByIdAndDelete(videoId);

    if (!deletedVideo) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res
      .status(500)
      .json({ message: "Error deleting video", error: error.message });
  }
};

module.exports = {
  uploadVideo,
  getVideos,
  getVideosByID,
  deleteVideo,
};
