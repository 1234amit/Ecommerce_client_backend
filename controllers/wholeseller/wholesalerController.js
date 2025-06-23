import bcrypt from "bcryptjs";
import User from "../../models/User.js";

// Get Wholesaler Profile
export const getWholesalerProfile = async (req, res) => {
  try {
    const wholesalerId = req.user.id; // Extract user ID from token
    const wholesaler = await User.findById(wholesalerId).select("-password"); // Exclude password field

    if (!wholesaler) {
      return res.status(404).json({ message: "Wholesaler not found" });
    }

    res.json({
      message: "Wholesaler profile fetched successfully",
      wholesaler,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Wholesaler Profile
export const updateWholesalerProfile = async (req, res) => {
  try {
    const wholesalerId = req.user.id; // Extract user ID from token
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

    // Handle image upload if file is provided
    if (req.file) {
      // Create full URL for the image
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      updateData.image = `${baseUrl}/${req.file.path}`;
    }

    const updatedWholesaler = await User.findByIdAndUpdate(
      wholesalerId,
      { $set: updateData },
      { new: true, runValidators: true, select: "-password" } // Exclude password field
    );

    if (!updatedWholesaler) {
      return res.status(404).json({ message: "Wholesaler not found" });
    }

    res.json({
      message: "Profile updated successfully",
      wholesaler: updatedWholesaler,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Wholesaler Profile Image Only
export const updateWholesalerProfileImage = async (req, res) => {
  try {
    const wholesalerId = req.user.id; // Extract user ID from token

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Create full URL for the image
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/${req.file.path}`;

    const updatedWholesaler = await User.findByIdAndUpdate(
      wholesalerId,
      { image: imageUrl },
      { new: true, runValidators: true, select: "-password" } // Exclude password field
    );

    if (!updatedWholesaler) {
      return res.status(404).json({ message: "Wholesaler not found" });
    }

    res.json({
      message: "Profile image updated successfully",
      wholesaler: updatedWholesaler,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Change Wholesaler Password
export const changeWholesalerPassword = async (req, res) => {
  try {
    const wholesalerId = req.user.id; // Extract user ID from token
    const { oldPassword, newPassword } = req.body;

    // Find user
    const wholesaler = await User.findById(wholesalerId);
    if (!wholesaler) {
      return res.status(404).json({ message: "Wholesaler not found" });
    }

    // Check if old password is correct
    const isMatch = await bcrypt.compare(oldPassword, wholesaler.password);
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
    wholesaler.password = newPassword;
    await wholesaler.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
