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

// ✅ Get All Consumers (Admin can see all, Consumers see only themselves)
export const getAllConsumers = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      // Admin can see all consumers
      const consumers = await User.find({ role: "consumer" }).select(
        "-password"
      );
      return res.json({
        message: "All consumers fetched successfully",
        consumers,
      });
    } else if (req.user.role === "consumer") {
      // Consumers can only see their own data
      const consumer = await User.findById(req.user.id).select("-password");
      return res.json({
        message: "Your profile fetched successfully",
        consumer,
      });
    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Consumer by ID (Admin Only)
export const getConsumerById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const consumer = await User.findOne({
      _id: userId,
      role: "consumer",
    }).select("-password");

    if (!consumer) {
      return res.status(404).json({ message: "Consumer not found" });
    }

    res.json({ message: "Consumer details fetched successfully", consumer });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Delete Consumer by ID (Admin Only)
export const deleteConsumerById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const consumer = await User.findOne({ _id: userId, role: "consumer" });

    if (!consumer) {
      return res.status(404).json({ message: "Consumer not found" });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: "Consumer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Search Consumer (Admin can search all consumers, Consumers can search themselves)
export const searchConsumer = async (req, res) => {
  try {
    const { query } = req.query; // Extract search query from URL

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    let searchCriteria = {
      role: "consumer",
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { nid: { $regex: query, $options: "i" } },
      ],
    };

    if (req.user.role === "consumer") {
      // Consumers can only search their own data
      searchCriteria._id = req.user.id;
    }

    const consumers = await User.find(searchCriteria).select("-password");

    if (consumers.length === 0) {
      return res.status(404).json({ message: "No consumers found" });
    }

    res.json({ message: "Consumers fetched successfully", consumers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get All SuperSalers (Admin Only)
export const getAllSuperSalers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const superSalers = await User.find({ role: "supersaler" }).select(
      "-password"
    );

    res.json({ message: "All SuperSalers fetched successfully", superSalers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get a Single SuperSaler by ID (Admin Only)
export const getSuperSalerById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const superSaler = await User.findOne({
      _id: userId,
      role: "supersaler",
    }).select("-password");

    if (!superSaler) {
      return res.status(404).json({ message: "SuperSaler not found" });
    }

    res.json({
      message: "SuperSaler details fetched successfully",
      superSaler,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const searchSuperSaler = async (req, res) => {
  try {
    const { query } = req.query; // Extract search query from URL

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const searchCriteria = {
      role: "supersaler",
      $or: [
        { name: new RegExp(query, "i") },
        { email: new RegExp(query, "i") },
        { phone: new RegExp(query, "i") },
        { nid: new RegExp(query, "i") },
      ],
    };

    const superSalers = await User.find(searchCriteria).select("-password");

    if (superSalers.length === 0) {
      return res.status(404).json({ message: "No SuperSalers found" });
    }

    res.json({ message: "SuperSalers fetched successfully", superSalers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Delete a SuperSaler by ID (Admin Only)
export const deleteSuperSalerById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const superSaler = await User.findOne({ _id: userId, role: "supersaler" });

    if (!superSaler) {
      return res.status(404).json({ message: "SuperSaler not found" });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: "SuperSaler deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getPendingSuperSalers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Fetch only SuperSalers whose status is "pending"
    const pendingSuperSalers = await User.find({
      role: "supersaler",
      status: "pending",
    }).select("-password");

    if (!pendingSuperSalers.length) {
      return res.status(404).json({ message: "No pending SuperSalers found" });
    }

    res.json({
      message: "Pending SuperSalers fetched successfully",
      pendingSuperSalers,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const approveSuperSaler = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const superSaler = await User.findOne({
      _id: userId,
      role: "supersaler",
      status: "pending",
    });

    if (!superSaler) {
      return res
        .status(404)
        .json({ message: "SuperSaler not found or already approved" });
    }

    superSaler.status = "approved";
    await superSaler.save();

    res.json({ message: "SuperSaler approved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
