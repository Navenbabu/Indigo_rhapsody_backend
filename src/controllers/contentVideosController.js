const ContentVideo = require("../models/contentVIdeosModel");
const Comment = require("../models/commentModel");

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
exports.getAllVideosWithLikesAndComments = async (req, res) => {
  try {
    // Fetch all videos regardless of approval status
    const videos = await ContentVideo.find()
      .populate("userId creatorId", "displayName email") // Populate user and creator details
      .lean(); // Convert Mongoose documents to plain JavaScript objects for easier manipulation

    if (!videos.length) {
      return res.status(404).json({ message: "No videos found." });
    }

    // Iterate over each video to fetch associated comments and add likes information
    const videosWithLikesAndComments = await Promise.all(
      videos.map(async (video) => {
        // Fetch comments for the current video
        const comments = await Comment.find({ videoId: video._id })
          .populate("userId", "displayName email") // Populate commenter details
          .sort({ createdAt: -1 })
          .lean(); // Get plain objects

        // Add comments and likes info to each video
        return {
          ...video,
          comments,
          likes: video.no_of_likes || 0, // Assuming no_of_likes field holds like count
          likedBy: video.likedBy || [], // Array of user IDs who liked the video
        };
      })
    );

    // Send the enriched video data as a response
    res.status(200).json({ videos: videosWithLikesAndComments });
  } catch (error) {
    console.error("Error fetching videos with likes and comments:", error);
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

exports.createComment = async (req, res) => {
  try {
    const { videoId, userId, commentText } = req.body;

    if (!videoId || !userId || !commentText) {
      return res
        .status(400)
        .json({ message: "Video ID, User ID, and comment text are required." });
    }

    const newComment = new Comment({
      videoId,
      userId,
      commentText,
    });

    await newComment.save();

    res.status(201).json({
      message: "Comment added successfully",
      comment: newComment,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getCommentsByVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    const comments = await Comment.find({ videoId })
      .populate("userId", "displayName email") // Populate user details
      .sort({ createdAt: -1 }); // Sort by most recent first

    if (!comments.length) {
      return res
        .status(404)
        .json({ message: "No comments found for this video." });
    }

    res.status(200).json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
