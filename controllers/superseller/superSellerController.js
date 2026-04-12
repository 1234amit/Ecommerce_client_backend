import Product from "../../models/Product.js";
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

    // Handle image upload if file is provided
    if (req.file) {
      // Create full URL for the image
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      updateData.image = `${baseUrl}/${req.file.path}`;
    }

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

// Update Supersaler Profile Image Only
export const updateSupersalerProfileImage = async (req, res) => {
  try {
    const supersalerId = req.user.id; // Extract user ID from token

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Create full URL for the image
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/${req.file.path}`;

    const updatedSupersaler = await User.findByIdAndUpdate(
      supersalerId,
      { image: imageUrl },
      { new: true, runValidators: true, select: "-password" } // Exclude password field
    );

    if (!updatedSupersaler) {
      return res.status(404).json({ message: "Supersaler not found" });
    }

    res.json({
      message: "Profile image updated successfully",
      supersaler: updatedSupersaler,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Change Supersaler Password
export const changeSupersalerPassword = async (req, res) => {
  try {
    const supersalerId = req.user?.id;
    const { oldPassword, newPassword } = req.body || {};

    if (!supersalerId) return res.status(401).json({ message: "Unauthorized" });
    if (typeof oldPassword !== "string" || typeof newPassword !== "string" || !oldPassword.trim() || !newPassword.trim())
      return res.status(400).json({ message: "oldPassword and newPassword are required" });
    if (oldPassword === newPassword)
      return res.status(400).json({ message: "New password must be different from old password" });

    const supersaler = await User.findById(supersalerId).select("+password");
    if (!supersaler) return res.status(404).json({ message: "Supersaler not found" });

    const isMatch = await bcrypt.compare(oldPassword, supersaler.password);
    if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

    supersaler.password = newPassword;
    await supersaler.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// import Product from "../../models/Product.js";

// ✅ Get All Approved Products (For Superseller)
export const getApprovedProductsForSuperseller = async (req, res) => {
  try {
    if (req.user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const products = await Product.find({ status: "approved" })
      .populate("producer", "name email phone")
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({
      message: "Approved products fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Error fetching approved products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// ✅ Superseller makes product available for consumer (Sell Product)
// export const supersellerSellProduct = async (req, res) => {
//   try {
//     if (req.user.role !== "supersaler") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const { productId } = req.params;

//     const product = await Product.findById(productId);

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     // Must be approved first
//     if (product.status !== "approved") {
//       return res.status(400).json({ message: "Product is not approved yet" });
//     }

//     product.isSelling = true;
//     product.updatedAt = new Date();

//     await product.save();

//     res.json({
//       message: "Product is now available for consumers",
//       product,
//     });
//   } catch (error) {
//     console.error("Error selling product:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

export const supersellerSellProduct = async (req, res) => {
  try {
    if (req.user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Must be approved first
    if (product.status !== "approved") {
      return res.status(400).json({ message: "Product is not approved yet" });
    }

    // If already selling request sent
    if (product.isSelling === true) {
      return res.status(400).json({ message: "Product already sent for selling request" });
    }

    // ✅ Set selling info
    product.isSelling = true;
    product.sellingBy = req.user.id;
    product.sellingRole = "supersaler";
    product.sellingConfirmedByProducer = false;
    product.sellingConfirmedAt = null;
    product.updatedAt = new Date();

    await product.save();

    res.json({
      message: "Selling request sent to producer successfully",
      product,
    });
  } catch (error) {
    console.error("Error selling product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
