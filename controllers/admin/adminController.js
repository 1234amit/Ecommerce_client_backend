import User from "../../models/User.js";
import bcrypt from "bcryptjs";

// Get Admin Profile
export const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id; // Extract user ID from token
    const admin = await User.findById(adminId).select("-password"); // Exclude password field

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ message: "Admin profile fetched successfully", admin });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Admin Profile
export const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id; // Extract user ID from token
    const { name, email, phone, division, district, thana, address, nid } =
      req.body;

    // Update only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (division) updateData.division = division;
    if (district) updateData.district = district;
    if (thana) updateData.thana = thana;
    if (address) updateData.address = address;
    if (nid) updateData.nid = nid;

    const updatedAdmin = await User.findByIdAndUpdate(
      adminId,
      { $set: updateData },
      { new: true, runValidators: true, select: "-password" } // Exclude password field
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ message: "Profile updated successfully", admin: updatedAdmin });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Change Admin Password
export const changeAdminPassword = async (req, res) => {
  try {
    const adminId = req.user.id; // Extract user ID from token
    const { oldPassword, newPassword } = req.body;

    // Find user
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if old password is correct
    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Check if new password is different from old password
    if (oldPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "New password must be different from old password" });
    }

    // Assign new password (Mongoose `pre("save")` middleware will hash it)
    admin.password = newPassword;
    await admin.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get All Users (Admin Only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password"); // Exclude password field for security
    res.json({ message: "All users fetched successfully", users });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Single User by ID (Admin Only)
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId, "-password"); // Exclude password field

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User details fetched successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Delete User by ID (Admin Only)
export const deleteUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
