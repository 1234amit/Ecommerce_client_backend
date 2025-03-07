import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Register User
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      nid,
      division,
      district,
      thana,
      address,
      tradelicense,
      password,
      role, // Adding role from request body (optional)
    } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    existingUser = await User.findOne({ phone });
    if (existingUser)
      return res.status(400).json({ message: "Phone already registered" });

    existingUser = await User.findOne({ nid });
    if (existingUser)
      return res.status(400).json({ message: "NID already registered" });

    existingUser = await User.findOne({ tradelicense });
    if (existingUser)
      return res
        .status(400)
        .json({ message: "Trade License already registered" });

    // Create new user
    const newUser = new User({
      name,
      email,
      phone,
      nid,
      division,
      district,
      thana,
      address,
      tradelicense,
      password,
      role: role || "consumer", // Default to "user" if role is not provided
    });

    await newUser.save();

    res.status(201).json({ message: "Registration successful", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// User Login
export const loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Check if phone and password are provided
    if (!phone || !password) {
      return res
        .status(400)
        .json({ message: "Phone and Password are required" });
    }

    // Find user by phone number
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: "Invalid Phone or Password" });
    }

    // Compare provided password with stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Phone or Password" });
    }

    // Generate JWT token with user ID and role
    const token = jwt.sign(
      { id: user._id, role: user.role }, // Include role in JWT
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Define role-based dashboard URLs
    const dashboardUrls = {
      admin: "/admin-dashboard",
      consumer: "/consumer-dashboard",
      producer: "/producer-dashboard",
      supersaler: "/supersaler-dashboard",
      wholesaler: "/wholesaler-dashboard",
      default: "/dashboard", // Default fallback
    };

    // Get the user's dashboard URL, fallback to default if role isn't mapped
    const dashboardUrl = dashboardUrls[user.role] || dashboardUrls.default;

    // Return success response with token, user data, and dashboard URL
    res.json({ message: "Login successful", token, user, dashboardUrl });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      blacklistedTokens.add(token); // Add token to blacklist
    }

    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
