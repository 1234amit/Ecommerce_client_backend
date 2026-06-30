import User from "../models/User.js";

const getImageUrlFromRequest = (req) => {
  if (typeof req.body?.image === "string" && req.body.image.trim()) {
    return req.body.image.trim();
  }

  if (req.file) {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return `${baseUrl}/${req.file.path}`;
  }

  return "";
};

// Unified profile endpoint for all user types
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "Profile fetched successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update profile for all user types
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, division, district, thana, address, nid } = req.body;

    // Create an update object with only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (division) updateData.division = division;
    if (district) updateData.district = district;
    if (thana) updateData.thana = thana;
    if (address) updateData.address = address;
    if (nid) updateData.nid = nid;

    const imageUrl = getImageUrlFromRequest(req);
    if (imageUrl) updateData.image = imageUrl;

    // Find and update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true, select: "-password" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update profile image only for all user types
export const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;

    const imageUrl = getImageUrlFromRequest(req);
    if (!imageUrl) {
      return res.status(400).json({ message: "No image provided" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { image: imageUrl },
      { new: true, runValidators: true, select: "-password" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile image updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}; 
