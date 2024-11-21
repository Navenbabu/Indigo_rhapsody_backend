const User = require("../models/userModel");
const Designer = require("../models/designerModel");
const { bucket } = require("../service/firebaseServices");
const { admin } = require("../service/firebaseServices");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AUTH_API_URL = "https://indigorhapsodyserver-h9a3.vercel.app/auth/login";
const nodemailer = require("nodemailer");

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const {
      email,
      displayName,
      phoneNumber,
      password,
      role,
      address,
      city,
      state,
      pincode,
      is_creator,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const newUser = new User({
      email,
      displayName,
      phoneNumber,
      password,
      role,
      address,
      city,
      state,
      pincode,
      is_creator,
    });

    await newUser.save();
    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body; // Accept updates dynamically

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const filters = req.query;
    const users = await User.find(filters);

    if (!users.length) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
exports.getTotalUserCount = async (req, res) => {
  try {
    // Count the number of users with the role "User"
    const totalUsers = await User.countDocuments({ role: "User" });

    return res.status(200).json({ totalUsers });
  } catch (error) {
    console.error("Error fetching total user count:", error);
    return res.status(500).json({
      message: "Error fetching total user count",
      error: error.message,
    });
  }
};

exports.getNewUsersByCurrentMonth = async (req, res) => {
  try {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

    const newUserCount = await User.countDocuments({
      role: "User",
      createdTime: { $gte: firstDayOfMonth },
    });

    res.status(200).json({ newUserCount });
  } catch (error) {
    console.error("Error fetching new users by month:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Endpoint to get new users count by state (only with role "User")
exports.getUserCountByState = async (req, res) => {
  try {
    const usersByState = await User.aggregate([
      { $match: { role: "User" } }, // Filter for role "User"
      { $group: { _id: "$state", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({ usersByState });
  } catch (error) {
    console.error("Error fetching users by state:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Endpoint to get the state with the most users (only with role "User")
exports.getStateWithMostUsers = async (req, res) => {
  try {
    const mostUsersState = await User.aggregate([
      { $match: { role: "User" } }, // Filter for role "User"
      { $group: { _id: "$state", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    if (!mostUsersState.length) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({ mostUsersState: mostUsersState[0] });
  } catch (error) {
    console.error("Error fetching state with most users:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Endpoint to get all users with the role "User"
exports.getAllUsersWithRoleUser = async (req, res) => {
  try {
    const users = await User.find({ role: "User" }); // Filter for role "User"

    if (!users.length) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users with role User:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Controller to create User and Designer
exports.createUserAndDesigner = async (req, res) => {
  const session = await User.startSession();
  let transactionCommitted = false; // Flag to track transaction status
  session.startTransaction();

  try {
    const {
      email,
      password,
      displayName,
      phoneNumber,
      role,
      address,
      city,
      state,
      pincode,
      is_creator,
      shortDescription,
      about,
      logoUrl,
      backgroundImageUrl,
    } = req.body;

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction(); // Abort if user already exists
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Create pickup location
    const addPickupResponse = await addPickupLocation({
      pickup_location: displayName,
      name: displayName,
      email,
      phone: phoneNumber,
      address,
      address_2: "", // Additional address line, if any
      city,
      state,
      country: "India",
      pin_code: pincode,
    });

    // Step 1: Create Firebase Auth User
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName,
      phoneNumber,
    });

    console.log("Firebase user created:", firebaseUser.uid);

    // Step 2: Create MongoDB User
    const newUser = new User({
      email,
      displayName,
      phoneNumber,
      password, // You may choose to hash this before storing.
      role,
      address,
      city,
      state,
      pincode,
      is_creator,
      firebaseUid: firebaseUser.uid, // Store Firebase UID for reference
    });

    await newUser.save({ session });

    // Step 3: Create Designer Document
    const newDesigner = new Designer({
      userId: newUser._id,
      logoUrl: logoUrl || null,
      backGroundImage: backgroundImageUrl || null,
      shortDescription,
      about,
    });

    await newDesigner.save({ session });

    // Commit transaction
    await session.commitTransaction();
    transactionCommitted = true; // Set flag to true after commit

    session.endSession();

    // Send welcome email
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: "sveccha.apps@gmail.com",
        pass: "4VhALB7qcgbYn0wv",
      },
    });

    const mailOptions = {
      from: '"Indigo Rhapsody" <sveccha.apps@gmail.com>',
      to: email,
      subject: "Welcome to the Indigo Rhapsody",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <img src="https://firebasestorage.googleapis.com/v0/b/sveccha-11c31.appspot.com/o/Logo.png?alt=media&token=c8b4c22d-8256-4092-8b46-e89e001bd1fe" alt="Indigo Rhapsody Logo" style="width: 150px; margin-bottom: 20px;">
          <h1>Welcome to the Seller Hub</h1>
          <p>You've signed up for amazing experiences from Indigo Rhapsody.</p>
          <p>We are so pleased to have you onboard.</p>
          <p>Please wait for approval from our team while your application is under review.</p>
          <div style="margin-top: 20px;">
            <a href="https://twitter.com" target="_blank" style="margin-right: 10px;">Twitter</a>
            <a href="https://facebook.com" target="_blank" style="margin-right: 10px;">Facebook</a>
            <a href="https://instagram.com" target="_blank">Instagram</a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: "User, Designer, and Pickup Location created successfully",
      user: newUser,
      designer: newDesigner,
      pickupResponse: addPickupResponse,
    });
  } catch (error) {
    if (!transactionCommitted) {
      // Only abort if the transaction has not been committed
      await session.abortTransaction();
    }
    session.endSession();
    console.error("Error creating user, designer, or pickup location:", error);
    res.status(500).json({
      message: `${error.code || "Error"}: ${error.message}`,
      error: error.message,
    });
  }
};

// AddPickupLocation function
const addPickupLocation = async (pickupDetails) => {
  try {
    // Fetch access token
    const authResponse = await fetch(AUTH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "rajatjiedm@gmail.com", // Replace with actual credentials
        password: "Raaxas12#", // Replace with actual credentials
      }),
    });

    const authBody = await authResponse.json();

    if (!authResponse.ok) {
      console.error("Failed to get access token:", authBody);
      throw new Error(authBody.message || "Failed to get access token");
    }

    const authToken = authBody.token;

    // Send request to Shiprocket API
    const response = await fetch(
      "https://apiv2.shiprocket.in/v1/external/settings/company/addpickup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(pickupDetails),
      }
    );

    const responseBody = await response.json();

    if (!response.ok) {
      console.error("Failed to add pickup location:", responseBody);
      throw new Error(responseBody.message || "Failed to add pickup location");
    }

    return responseBody;
  } catch (error) {
    console.error("Error adding pickup location:", error);
    throw error;
  }
};

exports.loginDesigner = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Step 1: Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Step 2: Check if the user's role is "Designer"
    if (user.role !== "Designer") {
      return res.status(403).json({ message: "Access denied. Not a designer" });
    }

    // Step 3: Validate the password (plain text comparison)
    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Step 4: Find the associated designer record
    const designer = await Designer.findOne({ userId: user._id });
    if (!designer) {
      return res.status(404).json({ message: "Designer profile not found" });
    }

    // Step 5: Generate a token (optional)

    // Step 6: Return userId, designerId, and token
    res.status(200).json({
      message: "Login successful",
      userId: user._id,
      designerId: designer._id,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Step 1: Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Step 2: Check if the user's role is "Admin"
    if (user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Not an admin" });
    }

    // Step 3: Validate the password (you should ideally use bcrypt for hashed passwords)
    const isPasswordValid = password === user.password; // Replace with bcrypt.compare if using hashed passwords
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Step 4: Generate a token (for authorization purposes)

    // Step 5: Return userId, role, and token
    res.status(200).json({
      message: "Login successful",
      userId: user._id,
      role: user.role,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
