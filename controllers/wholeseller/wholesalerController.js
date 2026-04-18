import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import Product from "../../models/Product.js";
import SellPost from "../../models/SellPost.js";

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


// ✅ Get All Approved Products (For Wholesaler)
export const getApprovedProductsForWholesaler = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
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


// ✅ Wholesaler makes product available for consumer (Sell Product)
// export const wholesalerSellProduct = async (req, res) => {
//   try {
//     if (req.user.role !== "wholesaler") {
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

export const wholesalerSellProduct = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
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
    product.sellingRole = "wholesaler";
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


// get bulk post

// export const getBulkPosts = async (req, res) => {
//   try {
//     if (req.user.role !== "wholesaler" && req.user.role !== "supersaler") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const posts = await SellPost.find({
//       sellType: "bulk",
//       isActive: true,
//       district: req.user.district,
//       thana: req.user.thana,
//     })
//       .populate("product", "productName image category")
//       .populate("seller", "name phone")
//       .sort({ createdAt: -1 });

//     res.json({ message: "Bulk posts fetched", posts });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// export const getBulkPostsForWholesaler = async (req, res) => {
//   try {
//     // ✅ Role Check
//     if (req.user.role !== "wholesaler") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     // ✅ district & thana validation
//     const wholesalerDistrict = req.user.district?.trim();
//     const wholesalerThana = req.user.thana?.trim();

//     if (!wholesalerDistrict || !wholesalerThana) {
//       return res.status(400).json({
//         message: "Wholesaler district and thana are required",
//       });
//     }

//     // ✅ Debug logs (keep for testing)
//     console.log("WHOLESALER DISTRICT:", wholesalerDistrict);
//     console.log("WHOLESALER THANA:", wholesalerThana);

//     // ✅ Case-insensitive match using regex
//     const posts = await SellPost.find({
//       sellType: "bulk",
//       isActive: true,
//       district: { $regex: new RegExp("^" + wholesalerDistrict + "$", "i") },
//       thana: { $regex: new RegExp("^" + wholesalerThana + "$", "i") },
//     })
//       .populate("product", "productName image category pricePerKg priceType unit")
//       .populate("seller", "name phone district thana role")
//       .populate("producer", "name phone district thana role")
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "Bulk posts fetched successfully",
//       totalPosts: posts.length,
//       posts,
//     });
//   } catch (error) {
//     console.error("Error fetching bulk posts:", error);
//     res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };



// GET bulk posts for wholesaler (FIXED & ROBUST)
export const getBulkPostsForWholesaler = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userDistrict = req.user.district?.trim().toLowerCase();
    const userThana = req.user.thana?.trim().toLowerCase();

    const posts = await SellPost.find({
      sellType: "bulk",
      isActive: true,
    });

    const filtered = posts.filter((p) => {
      const district =
        (p.district || p.seller?.district || p.producer?.district)
          ?.trim()
          .toLowerCase();

      const thana =
        (p.thana || p.seller?.thana || p.producer?.thana)
          ?.trim()
          .toLowerCase();

      return district === userDistrict && thana === userThana;
    });

    return res.json({
      message: "Bulk posts fetched successfully",
      totalFound: filtered.length,
      posts: filtered,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


