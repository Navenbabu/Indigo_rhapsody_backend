const mongoose = require("mongoose");
const Designer = require("../models/designerModel");
const path = require("path");
const { bucket } = require("../service/firebaseServices"); // Firebase storage configuration

// Upload Image Helper Function
const uploadImage = async (file, folder) => {
  const filename = `${Date.now()}_${file.originalname}`;
  const blob = bucket.file(`${folder}/${filename}`);

  return new Promise((resolve, reject) => {
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        firebaseStorageDownloadTokens: Math.random().toString(36),
      },
    });

    blobStream.on("error", (error) => {
      console.error("Error uploading image:", error);
      reject(error);
    });

    blobStream.on("finish", async () => {
      try {
        const firebaseUrl = await blob.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });
        resolve(firebaseUrl[0]);
      } catch (error) {
        reject(new Error(`Error getting signed URL: ${error.message}`));
      }
    });

    blobStream.end(file.buffer);
  });
};

// Create a new Designer
exports.createDesigner = async (req, res) => {
  try {
    const { userId, shortDescription, about } = req.body;

    // Retrieve files from request
    const logoFile = req.files?.logo?.[0];
    const backgroundFile = req.files?.backGroundImage?.[0];

    // Upload files to Firebase if provided
    const logoUrl = logoFile
      ? await uploadImage(logoFile, "designer_logos")
      : null;

    const backGroundImageUrl = backgroundFile
      ? await uploadImage(backgroundFile, "designer_backgrounds")
      : null;

    // Create a new designer document
    const designer = new Designer({
      userId,
      logoUrl,
      backGroundImage: backGroundImageUrl,
      shortDescription,
      about,
    });

    // Save the designer document to MongoDB
    await designer.save();

    console.log("Designer created successfully:", designer);
    return res.status(201).json({
      message: "Designer created successfully",
      designer,
    });
  } catch (error) {
    console.error("Error creating designer:", error.message);
    return res.status(500).json({
      message: "Error creating designer",
      error: error.message,
    });
  }
};

// Get All Designers
exports.getAllDesigners = async (req, res) => {
  try {
    const designers = await Designer.find().populate("userId", "displayName");

    if (!designers.length) {
      return res.status(404).json({ message: "No designers found" });
    }

    return res.status(200).json({ designers });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching designers",
      error: error.message,
    });
  }
};

// Get Designer by ID
exports.getDesignerById = async (req, res) => {
  try {
    const { id } = req.params;
    const designer = await Designer.findById(id).populate(
      "userId",
      "displayName email phoneNumber address city state pincode"
    );

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res.status(200).json({ designer });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching designer",
      error: error.message,
    });
  }
};

// Update Designer
exports.updateDesigner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Handle image uploads if new images are provided
    if (req.files.logo) {
      updates.logoUrl = await uploadImage(req.files.logo[0], "designer_logos");
    }

    if (req.files.backGroundImage) {
      updates.backGroundImage = await uploadImage(
        req.files.backGroundImage[0],
        "designer_backgrounds"
      );
    }

    updates.updatedTime = Date.now(); // Update timestamp

    const designer = await Designer.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res
      .status(200)
      .json({ message: "Designer updated successfully", designer });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating designer",
      error: error.message,
    });
  }
};

// Delete Designer
exports.deleteDesigner = async (req, res) => {
  try {
    const { id } = req.params;

    const designer = await Designer.findByIdAndDelete(id);

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res.status(200).json({ message: "Designer deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting designer",
      error: error.message,
    });
  }
};

exports.getTotalDesignerCount = async (req, res) => {
  try {
    // Count the total number of documents in the Designer collection
    const totalDesigners = await Designer.countDocuments();

    return res.status(200).json({ totalDesigners });
  } catch (error) {
    console.error("Error fetching total designer count:", error);
    return res.status(500).json({
      message: "Error fetching total designer count",
      error: error.message,
    });
  }
};

// Get Designer Details and Associated User by Designer ID
exports.getDesignerDetailsById = async (req, res) => {
  try {
    const { designerId } = req.params;

    // Find the designer and populate user details
    const designer = await Designer.findById(designerId).populate(
      "userId",
      "displayName email phoneNumber address"
    );

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res.status(200).json({ designer });
  } catch (error) {
    console.error("Error fetching designer details:", error);
    return res.status(500).json({
      message: "Error fetching designer details",
      error: error.message,
    });
  }
};
exports.updateDesignerInfo = async (req, res) => {
  try {
    const { designerId } = req.params;
    const { _id, ...updates } = req.body; // Destructure _id to exclude it from updates

    // Include only the necessary fields for update
    if (updates.logoUrl) {
      updates.logoUrl = updates.logoUrl;
    }

    if (updates.backGroundImage) {
      updates.backGroundImage = updates.backGroundImage;
    }

    // Update timestamp
    updates.updatedTime = Date.now();

    const updatedDesigner = await Designer.findByIdAndUpdate(
      designerId,
      updates,
      {
        new: true,
      }
    ).populate("userId", "displayName email phoneNumber address");

    if (!updatedDesigner) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res.status(200).json({
      message: "Designer information updated successfully",
      designer: updatedDesigner,
    });
  } catch (error) {
    console.error("Error updating designer information:", error);
    return res.status(500).json({
      message: "Error updating designer information",
      error: error.message,
    });
  }
};

exports.getPendingDesignerCount = async (req, res) => {
  try {
    const pendingCount = await Designer.countDocuments({ is_approved: false });
    return res.status(200).json({ pendingCount });
  } catch (error) {
    console.error("Error fetching pending designer count:", error);
    return res.status(500).json({
      message: "Error fetching pending designer count",
      error: error.message,
    });
  }
};

// Get the count of approved designers (is_approved: true)
exports.getApprovedDesignerCount = async (req, res) => {
  try {
    const approvedCount = await Designer.countDocuments({ is_approved: true });
    return res.status(200).json({ approvedCount });
  } catch (error) {
    console.error("Error fetching approved designer count:", error);
    return res.status(500).json({
      message: "Error fetching approved designer count",
      error: error.message,
    });
  }
};

exports.updateDesignerApprovalStatus = async (req, res) => {
  try {
    const { designerId } = req.params;
    const { is_approved } = req.body;

    // Ensure is_approved is a boolean before updating
    if (typeof is_approved !== "boolean") {
      return res.status(400).json({ message: "Invalid approval status" });
    }

    const designer = await Designer.findByIdAndUpdate(
      designerId,
      { is_approved, updatedTime: Date.now() },
      { new: true }
    ).populate("userId", "displayName email phoneNumber address");

    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    return res.status(200).json({
      message: `Designer approval status updated successfully`,
      designer,
    });
  } catch (error) {
    console.error("Error updating designer approval status:", error);
    return res.status(500).json({
      message: "Error updating designer approval status",
      error: error.message,
    });
  }
};
