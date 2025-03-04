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
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid Email or Password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid Email or Password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
