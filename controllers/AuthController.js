import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();


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

    let existingUser;

    if (nid) {
      existingUser = await User.findOne({ nid });
      if (existingUser)
        return res.status(400).json({ message: "NID already registered" });
    }

   
    const rolesRequiringApproval = [
      "supersaler",
      "wholesaler",
      "producer",
    ];

    const status = rolesRequiringApproval.includes(role)
      ? "pending"
      : "approved";

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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


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

//     // Set default role to "consumer" if not provided
//     const userRole = role || "consumer";

//     // Validate required fields for non-consumers
//     if (
//       userRole !== "consumer" &&
//       (!name || !nid || !division || !district || !thana || !address || !tradelicense)
//     ) {
//       return res.status(400).json({ message: "All fields are required for non-consumers" });
//     }

//     // Check if email or phone already exists
//     let existingUser = await User.findOne({ $or: [{ email }, { phone }] });
//     if (existingUser) {
//       return res.status(400).json({ message: "Email or phone already registered" });
//     }

//     // Define roles that require admin approval
//     const rolesRequiringApproval = ["supersaler", "wholesaler", "producer"];
//     const status = rolesRequiringApproval.includes(userRole) ? "pending" : "approved";

//     // Hash password before saving
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create user object dynamically to exclude `nid` for consumers
//     const newUserData = {
//       email,
//       phone,
//       password: hashedPassword,
//       tradelicense,
//       role: userRole,
//       status,
//     };

//     if (userRole !== "consumer") {
//       newUserData.name = name;
//       newUserData.nid = nid;
//       newUserData.division = division;
//       newUserData.district = district;
//       newUserData.thana = thana;
//       newUserData.address = address;
//     }

//     // **Ensure `nid` is removed for consumers to avoid `null` conflicts**
//     if (userRole === "consumer") {
//       delete newUserData.nid;
//     }

//     // Create and save user
//     const newUser = new User(newUserData);
//     await newUser.save();

//     res.status(201).json({
//       message: `Registration successful${status === "pending" ? ", pending admin approval" : ""}`,
//       user: newUser,
//     });
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
    // if (user.role === "supersaler" && user.status !== "approved") {
    //   return res
    //     .status(403)
    //     .json({ message: "Admin approval required for login" });
    // }
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
