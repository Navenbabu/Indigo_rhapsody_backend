const Video = require("../models/videosModel");
const mongoose = require("mongoose");

exports.createVideoCreator = async (req, res) => {
  try {
    const { userId, instagram_User, demo_url } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if the user already has a pending request
    const existingRequest = await Video.findOne({ userId, is_approved: false });

    if (existingRequest) {
      return res.status(400).json({
        message: "You already have a pending request awaiting approval.",
      });
    }

    // Create the video creator document with is_approved set to false
    const newVideoCreator = new Video({
      userId,
      instagram_User,
      demo_url,
      is_approved: false, // Default to false, requires admin approval
    });

    await newVideoCreator.save();

    res.status(201).json({
      message:
        "Video creator request submitted successfully, awaiting approval",
      creator: newVideoCreator,
    });
  } catch (error) {
    console.error("Error creating video creator:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.approveVideoCreator = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { is_approved } = req.body;

    const updatedCreator = await Video.findByIdAndUpdate(
      videoId,
      { is_approved, updated_at: Date.now() },
      { new: true }
    );

    if (!updatedCreator) {
      return res.status(404).json({ message: "Video creator not found" });
    }

    res.status(200).json({
      message: `Video creator ${
        is_approved ? "approved" : "rejected"
      } successfully`,
      creator: updatedCreator,
    });
  } catch (error) {
    console.error("Error updating video creator status:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
exports.createVideo = async (req, res) => {
  try {
    const { userId, videoUrl } = req.body;

    if (!userId || !videoUrl) {
      return res
        .status(400)
        .json({ message: "User ID and Video URL are required" });
    }

    // Check if the user is an approved creator
    const approvedCreator = await Video.findOne({ userId, is_approved: true });

    if (!approvedCreator) {
      return res.status(403).json({
        message: "You are not an approved video creator. Contact admin.",
      });
    }

    // Create a new video
    const newVideo = new Video({
      userId,
      videoUrl,
    });

    await newVideo.save();
    res
      .status(201)
      .json({ message: "Video created successfully", video: newVideo });
  } catch (error) {
    console.error("Error creating video:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.createVideo = async (req, res) => {
  try {
    const { userId, instagram_User, demo_url, videoUrl } = req.body;

    if (!userId || !videoUrl) {
      return res
        .status(400)
        .json({ message: "User ID and Video URL are required" });
    }

    const newVideo = new Video({
      userId,
      instagram_User,
      demo_url,
      videoUrl,
    });

    await newVideo.save();
    res
      .status(201)
      .json({ message: "Video created successfully", video: newVideo });
  } catch (error) {
    console.error("Error creating video:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all videos for all users
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find({ is_approved: true }).populate(
      "userId",
      "displayName email"
    );

    if (!videos.length) {
      return res.status(404).json({ message: "No videos found" });
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

// Get videos for a particular user by userId
exports.getVideosByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const videos = await Video.find({ userId }).populate(
      "userId",
      "displayName email"
    );

    if (!videos.length) {
      return res.status(404).json({ message: "No videos found for this user" });
    }

    res.status(200).json({ videos });
  } catch (error) {
    console.error("Error fetching user videos:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Update video approval status by admin
exports.updateVideoStatus = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { is_approved } = req.body;

    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      { is_approved, updated_at: Date.now() },
      { new: true }
    );

    if (!updatedVideo) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.status(200).json({
      message: "Video status updated successfully",
      video: updatedVideo,
    });
  } catch (error) {
    console.error("Error updating video status:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Get a single video by its ID
exports.getVideoById = async (req, res) => {
  try {
    const { videoId } = req.params;

    const video = await Video.findById(videoId).populate(
      "userId",
      "displayName email"
    );

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.status(200).json({ video });
  } catch (error) {
    console.error("Error fetching video:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Check video creator approval status by userId
exports.checkApprovalStatus = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find the creator's latest request
    const creatorRequest = await Video.findOne({ userId })
      .sort({ created_at: -1 }) // Get the latest request
      .select("is_approved");

    if (!creatorRequest) {
      return res
        .status(404)
        .json({ message: "No request found for this user" });
    }

    res.status(200).json({
      message: "Status retrieved successfully",
      is_approved: creatorRequest.is_approved,
    });
  } catch (error) {
    console.error("Error checking approval status:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.createOrUpdateVideo = async (req, res) => {
  try {
    const { userId, videoUrl, instagram_User, demo_url } = req.body;

    if (!userId || !videoUrl) {
      return res
        .status(400)
        .json({ message: "User ID and Video URL are required" });
    }

    // Check if the user already has an approved video entry
    const existingVideo = await Video.findOne({ userId, is_approved: true });

    if (existingVideo) {
      // Update existing entry by pushing new video URL
      existingVideo.videoUrl.push(...videoUrl);
      existingVideo.updated_at = Date.now();
      await existingVideo.save();

      return res.status(200).json({
        message: "Video added successfully",
        video: existingVideo,
      });
    } else {
      // Create a new video entry for the user
      const newVideo = new Video({
        userId,
        videoUrl,
        instagram_User,
        demo_url,
      });

      await newVideo.save();
      return res
        .status(201)
        .json({ message: "New video created successfully", video: newVideo });
    }
  } catch (error) {
    console.error("Error adding or updating video:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
