import bcrypt from "bcryptjs";
import User from "../../models/User.js";

// Get Producer Profile
export const getProducerProfile = async (req, res) => {
  try {
    const producerId = req.user.id; // Extract user ID from token
    const producer = await User.findById(producerId).select("-password"); // Exclude password field

    if (!producer) {
      return res.status(404).json({ message: "Producer not found" });
    }

    res.json({ message: "Producer profile fetched successfully", producer });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Producer Profile
export const updateProducerProfile = async (req, res) => {
  try {
    const producerId = req.user.id; // Extract user ID from token
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

    const updatedProducer = await User.findByIdAndUpdate(
      producerId,
      { $set: updateData },
      { new: true, runValidators: true, select: "-password" } // Exclude password field
    );

    if (!updatedProducer) {
      return res.status(404).json({ message: "Producer not found" });
    }

    res.json({
      message: "Profile updated successfully",
      producer: updatedProducer,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Change Producer Password
export const changeProducerPassword = async (req, res) => {
  try {
    const producerId = req.user.id; // Extract user ID from token
    const { oldPassword, newPassword } = req.body;

    // Find user
    const producer = await User.findById(producerId);
    if (!producer) {
      return res.status(404).json({ message: "Producer not found" });
    }

    // Check if old password is correct
    const isMatch = await bcrypt.compare(oldPassword, producer.password);
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
    producer.password = newPassword;
    await producer.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
