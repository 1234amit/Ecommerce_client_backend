import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Register User
// export const registerUser = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       phone,
//       nid,
//       division,
//       district,
//       thana,
//       address,
//       tradelicense,
//       password,
//       role, // Optional role
//     } = req.body;

//     let existingUser;

//     // Check if user already exists
//     existingUser = await User.findOne({ phone });
//     if (existingUser)
//       return res.status(400).json({ message: "Phone already registered" });

//     existingUser = await User.findOne({ nid });
//     if (existingUser)
//       return res.status(400).json({ message: "NID already registered" });

//     // Create new user (Password will be hashed automatically via pre("save") middleware)
//     const newUser = new User({
//       name,
//       email,
//       phone,
//       nid,
//       division,
//       district,
//       thana,
//       address,
//       tradelicense,
//       password, // Do not hash manually, let the middleware handle it
//       role: role || "consumer",
//     });

//     await newUser.save();

//     res.status(201).json({ message: "Registration successful", user: newUser });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

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
      role, // Optional role
    } = req.body;

    let existingUser;

    // Check if user already exists
    existingUser = await User.findOne({ phone });
    if (existingUser)
      return res.status(400).json({ message: "Phone already registered" });

    existingUser = await User.findOne({ nid });
    if (existingUser)
      return res.status(400).json({ message: "NID already registered" });

    // Set status as "pending" if registering as SuperSaler
    const status = role === "supersaler" ? "pending" : "approved";

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
      role: role || "consumer",
      status, // New field
    });

    await newUser.save();

    res.status(201).json({
      message: "Registration successful, pending admin approval",
      user: newUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// User Login
// export const loginUser = async (req, res) => {
//   try {
//     const { phone, password } = req.body;

//     // Check if phone and password are provided
//     if (!phone || !password) {
//       return res
//         .status(400)
//         .json({ message: "Phone and Password are required" });
//     }

//     // Find user by phone number
//     const user = await User.findOne({ phone });
//     if (!user) {
//       return res.status(400).json({ message: "Invalid Phone or Password" });
//     }

//     // Compare provided password with stored hashed password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid Phone or Password" });
//     }

//     // Generate JWT token with user ID and role
//     const token = jwt.sign(
//       { id: user._id, role: user.role }, // Include role in JWT
//       process.env.JWT_SECRET,
//       { expiresIn: "30d" }
//     );

//     res.json({ message: "Login successful", token, user });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

export const loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res
        .status(400)
        .json({ message: "Phone and Password are required" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: "Invalid Phone or Password" });
    }

    // Prevent login if user is a SuperSaler and not yet approved
    if (user.role === "supersaler" && user.status !== "approved") {
      return res
        .status(403)
        .json({ message: "Admin approval required for login" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Phone or Password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ message: "Login successful", token, user });
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
