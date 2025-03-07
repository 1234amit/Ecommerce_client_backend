import User from "../../models/User.js";
import bcrypt from "bcryptjs";

// Get User Profile (Logged-in User)
export const getOwnProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Extract user ID from token
    const user = await User.findById(userId, "-password"); // Exclude password field

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User profile fetched successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update User Profile (Logged-in User)
export const updateOwnProfile = async (req, res) => {
  try {
    let userId = req.user.id; // Default to the logged-in user ID

    // If admin wants to update a different consumer profile, use req.params.id
    if (req.params.id) {
      userId = req.params.id;
    }

    const { name, email, phone, division, district, thana, address, nid } =
      req.body;

    // Create an update object with only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (division) updateData.division = division;
    if (district) updateData.district = district;
    if (thana) updateData.thana = thana;
    if (address) updateData.address = address;
    if (nid) updateData.nid = nid; // ✅ Fix: Ensure `nid` is included in the update

    // Find and update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData }, // Only update provided fields
      { new: true, runValidators: true, select: "-password" } // Return updated user without password
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Change Consumer Password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // Extract user ID from token
    const { oldPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if old password is correct
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Check if new password is different from old password
    if (oldPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "New password must be different from old password" });
    }

    // Update password directly (Mongoose `pre("save")` middleware will handle hashing)
    user.password = newPassword;
    await user.save(); // This will trigger pre("save") to hash the password

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
