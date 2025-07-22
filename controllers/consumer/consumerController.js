import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import Product from "../../models/Product.js"; // Added import for Product
import Category from "../../models/Category.js";

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

    // Handle image upload if file is provided
    if (req.file) {
      // Create full URL for the image
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      updateData.image = `${baseUrl}/${req.file.path}`;
    }

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

// Update Consumer Profile Image Only
export const updateConsumerProfileImage = async (req, res) => {
  try {
    const userId = req.user.id; // Extract user ID from token

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Create full URL for the image
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/${req.file.path}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { image: imageUrl },
      { new: true, runValidators: true, select: "-password" } // Exclude password field
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

// view all category

// View all categories for consumer
export const getAllCategoriesForConsumer = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    if (!categories || categories.length === 0) {
      return res.status(404).json({ message: "No categories found" });
    }

    res.json({
      message: "Categories fetched successfully",
      count: categories.length,
      categories
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// View all products for consumer
export const viewAllProducts = async (req, res) => {
  try {
    // Get all products with producer information
    const products = await Product.find({})
      .populate('producer', 'name email phone division district thana address image')
      .sort({ createdAt: -1 }); // Sort by newest first

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    res.json({ 
      message: "Products fetched successfully", 
      count: products.length,
      products 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// View single product by ID for consumer
export const viewSingleProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate product ID
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Find product by ID with producer information
    const product = await Product.findById(productId)
      .populate('producer', 'name email phone division district thana address image');

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ 
      message: "Product fetched successfully", 
      product 
    });
  } catch (error) {
    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};





