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
// export const getAllUsers = async (req, res) => {
//   try {
//     const users = await User.find({}, "-password"); // Exclude password field for security
//     res.json({ message: "All users fetched successfully", users });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// Get All Users (Admin Only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password").select("+lastLogin"); // Include lastLogin field
    res.json({ 
      message: "All users fetched successfully", 
      users: users.map(user => ({
        ...user.toObject(),
        lastLogin: user.lastLogin || "Never logged in" // Format last login time
      }))
    });
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
//get full wholesaler
export const getAllWholesalers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const wholesalers = await User.find({ role: "wholesaler" }).select(
      "-password"
    );

    if (wholesalers.length === 0) {
      return res.status(404).json({ message: "No wholesalers found" });
    }

    res.json({
      message: "All wholesalers fetched successfully",
      wholesalers,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
//get single wholesaler
export const getWholesalerById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const wholesaler = await User.findOne({
      _id: userId,
      role: "wholesaler",
    }).select("-password");

    if (!wholesaler) {
      return res.status(404).json({ message: "Wholesaler not found" });
    }

    res.json({
      message: "Wholesaler details fetched successfully",
      wholesaler,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//search whole seller
export const searchWholesaler = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { query } = req.query; // Extract search query from URL

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const searchCriteria = {
      role: "wholesaler",
      $or: [
        { name: new RegExp(query, "i") },
        { email: new RegExp(query, "i") },
        { phone: new RegExp(query, "i") },
        { nid: new RegExp(query, "i") },
      ],
    };

    const wholesalers = await User.find(searchCriteria).select("-password");

    if (wholesalers.length === 0) {
      return res.status(404).json({ message: "No wholesalers found" });
    }

    res.json({
      message: "Wholesalers fetched successfully",
      wholesalers,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//delete wholesaler
export const deleteWholesalerById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const wholesaler = await User.findOne({ _id: userId, role: "wholesaler" });

    if (!wholesaler) {
      return res.status(404).json({ message: "Wholesaler not found" });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: "Wholesaler deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getPendingWholesalers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Fetch only wholesalers whose status is "pending"
    const pendingWholesalers = await User.find({
      role: "wholesaler",
      status: "pending",
    }).select("-password");

    if (pendingWholesalers.length === 0) {
      return res.status(404).json({ message: "No pending wholesalers found" });
    }

    res.json({
      message: "Pending wholesalers fetched successfully",
      pendingWholesalers,
    });
  } catch (error) {
    console.error("Error fetching pending wholesalers:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const approveWholesaler = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const wholesaler = await User.findOne({
      _id: userId,
      role: "wholesaler",
      status: "pending",
    });

    if (!wholesaler) {
      return res
        .status(404)
        .json({ message: "Wholesaler not found or already approved" });
    }

    wholesaler.status = "approved";
    await wholesaler.save();

    res.json({ message: "Wholesaler approved successfully" });
  } catch (error) {
    console.error("Error approving wholesaler:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get all producer
export const getAllProducers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const producers = await User.find({ role: "producer" }).select("-password");

    if (producers.length === 0) {
      return res.status(404).json({ message: "No producers found" });
    }

    res.json({
      message: "All producers fetched successfully",
      producers,
    });
  } catch (error) {
    console.error("Error fetching producers:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get single producer by admin
export const getProducerById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const producer = await User.findOne({
      _id: userId,
      role: "producer",
    }).select("-password");

    if (!producer) {
      return res.status(404).json({ message: "Producer not found" });
    }

    res.json({
      message: "Producer details fetched successfully",
      producer,
    });
  } catch (error) {
    console.error("Error fetching producer:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//search producer
export const searchProducer = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { query } = req.query; // Extract search query from URL

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const searchCriteria = {
      role: "producer",
      $or: [
        { name: new RegExp(query, "i") },
        { email: new RegExp(query, "i") },
        { phone: new RegExp(query, "i") },
        { nid: new RegExp(query, "i") },
      ],
    };

    const producers = await User.find(searchCriteria).select("-password");

    if (producers.length === 0) {
      return res.status(404).json({ message: "No producers found" });
    }

    res.json({
      message: "Producers fetched successfully",
      producers,
    });
  } catch (error) {
    console.error("Error searching producers:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//delete producer
export const deleteProducerById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const producer = await User.findOne({ _id: userId, role: "producer" });

    if (!producer) {
      return res.status(404).json({ message: "Producer not found" });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: "Producer deleted successfully" });
  } catch (error) {
    console.error("Error deleting producer:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get pending producer
export const getPendingProducers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Fetch only producers whose status is "pending"
    const pendingProducers = await User.find({
      role: "producer",
      status: "pending",
    }).select("-password");

    if (pendingProducers.length === 0) {
      return res.status(404).json({ message: "No pending producers found" });
    }

    res.json({
      message: "Pending producers fetched successfully",
      pendingProducers,
    });
  } catch (error) {
    console.error("Error fetching pending producers:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//approve producer by admin
export const approveProducer = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.params.id;
    const producer = await User.findOne({
      _id: userId,
      role: "producer",
      status: "pending",
    });

    if (!producer) {
      return res
        .status(404)
        .json({ message: "Producer not found or already approved" });
    }

    producer.status = "approved";
    await producer.save();

    res.json({ message: "Producer approved successfully" });
  } catch (error) {
    console.error("Error approving producer:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
