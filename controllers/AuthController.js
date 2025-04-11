import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();


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
//       role, 
//     } = req.body;

//     let existingUser;

//     if (nid) {
//       existingUser = await User.findOne({ nid });
//       if (existingUser)
//         return res.status(400).json({ message: "NID already registered" });
//     }

   
//     const rolesRequiringApproval = [
//       "supersaler",
//       "wholesaler",
//       "producer",
//     ];

//     const status = rolesRequiringApproval.includes(role)
//       ? "pending"
//       : "approved";

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
//       password,
//       role: role || "consumer",
//       status, 
//     });

//     await newUser.save();

//     res.status(201).json({
//       message: "Registration successful, pending admin approval",
//       user: newUser,
//     });
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
      role,
    } = req.body;

    const rolesRequiringApproval = ["supersaler", "wholesaler", "producer"];
    const status = rolesRequiringApproval.includes(role) ? "pending" : "approved";

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
      status,
    });

    await newUser.save();

    res.status(201).json({
      message: "Registration successful, pending admin approval",
      user: newUser,
    });

  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      const duplicateValue = error.keyValue[duplicateField];
      
      return res.status(400).json({
        message: `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already registered`,
        field: duplicateField,
        value: duplicateValue
      });
    }

    // Other unexpected server errors
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const registerConsumer = async (req, res) => {
  try {
    const { name, phone, role = "consumer", password, email, nid, division, district, thana, address, tradelicense } = req.body;

    // Ensure required fields for consumer
    if (role === "consumer" && (!name || !phone || !password)) {
      return res.status(400).json({ message: "Name, phone, and password are required for consumers" });
    }

    // Ensure required fields for non-consumers
    if (role !== "consumer" && (!name || !nid || !division || !district || !thana || !address || !phone || !password)) {
      return res.status(400).json({ message: "All fields are required for non-consumers" });
    }

    // Check if phone is already registered
    let existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    // Check if email or NID already exists (if provided)
    if (email || nid) {
      let existingUserByEmailOrNid = await User.findOne({ $or: [{ email }, { nid }] });
      if (existingUserByEmailOrNid) {
        return res.status(400).json({ message: "Email or NID already registered" });
      }
    }

    // Ensure unique trade license (if provided)
    if (tradelicense) {
      let existingTradeLicense = await User.findOne({ tradelicense });
      if (existingTradeLicense) {
        return res.status(400).json({ message: "Trade license already registered" });
      }
    }

    // Define roles that require admin approval
    const rolesRequiringApproval = ["supersaler", "wholesaler", "producer"];
    const status = rolesRequiringApproval.includes(role) ? "pending" : "approved";

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user object
    const newUser = new User({
      name,
      phone,
      role,
      password,
      email:role !== "consumer" ? email : undefined,
      nid: role !== "consumer" ? nid : undefined,  // Use undefined instead of null
      division: role !== "consumer" ? division : undefined,
      district: role !== "consumer" ? district : undefined,
      thana: role !== "consumer" ? thana : undefined,
      address: role !== "consumer" ? address : undefined,
      tradelicense: role !== "consumer" ? tradelicense : undefined,
      status,
    });
    

    await newUser.save();

    res.status(201).json({
      message: `Registration successful${status === "pending" ? ", pending admin approval" : ""}`,
      user: newUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

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

    // Prevent login if user is pending approval
    if (user.status !== "approved") {
      return res
        .status(403)
        .json({ message: "Admin approval required for login" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Phone or Password" });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.jwt_secret,
      { expiresIn: "30d" }
    );

    res.json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// export const logoutUser = async (req, res) => {
//   try {
//     const token = req.headers.authorization?.split(" ")[1];
//     if (token) {
//       blacklistedTokens.add(token); // Add token to blacklist
//     }

//     res.json({ message: "Logout successful" });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// Create a temporary in-memory blacklist (not persistent across server restarts)
export const blacklistedTokens = new Set();


export const logoutUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: "Token not provided" });
    }

    blacklistedTokens.add(token); // Add token to in-memory blacklist

    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};






