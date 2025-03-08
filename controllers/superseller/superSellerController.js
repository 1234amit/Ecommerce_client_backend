import User from "../../models/User.js";
import bcrypt from "bcryptjs";

// Get Supersaler Profile
export const getSupersalerProfile = async (req, res) => {
  try {
    const supersalerId = req.user.id; // Extract user ID from token
    const supersaler = await User.findById(supersalerId).select("-password"); // Exclude password field

    if (!supersaler) {
      return res.status(404).json({ message: "Supersaler not found" });
    }

    res.json({
      message: "Supersaler profile fetched successfully",
      supersaler,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Supersaler Profile
export const updateSupersalerProfile = async (req, res) => {
  try {
    const supersalerId = req.user.id; // Extract user ID from token
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

    const updatedSupersaler = await User.findByIdAndUpdate(
      supersalerId,
      { $set: updateData },
      { new: true, runValidators: true, select: "-password" } // Exclude password field
    );

    if (!updatedSupersaler) {
      return res.status(404).json({ message: "Supersaler not found" });
    }

    res.json({
      message: "Profile updated successfully",
      supersaler: updatedSupersaler,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Change Supersaler Password
export const changeSupersalerPassword = async (req, res) => {
  try {
    const supersalerId = req.user.id; // Extract user ID from token
    const { oldPassword, newPassword } = req.body;

    // Find user
    const supersaler = await User.findById(supersalerId);
    if (!supersaler) {
      return res.status(404).json({ message: "Supersaler not found" });
    }

    // Check if old password is correct
    const isMatch = await bcrypt.compare(oldPassword, supersaler.password);
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
    supersaler.password = newPassword;
    await supersaler.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
