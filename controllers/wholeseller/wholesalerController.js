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


// GET bulk posts for wholesaler (FIXED & ROBUST)

// export const getBulkPostsForWholesaler = async (req, res) => {
//   try {
//     if (req.user.role !== "wholesaler") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const userDistrict = req.user.district?.trim();
//     const userThana = req.user.thana?.trim();

//     if (!userDistrict || !userThana) {
//       return res.status(400).json({ message: "District and thana required" });
//     }

//     const posts = await SellPost.find({
//       sellType: "bulk",
//       isActive: true,
//       remainingQuantity: { $gt: 0 }, // 🔥 only available stock
//       district: userDistrict,
//       thana: userThana,
//       visibility: { $in: ["all", "wholesaler"] },
//     }).sort({ createdAt: -1 });

//     return res.json({
//       message: "Bulk posts fetched successfully",
//       totalFound: posts.length,
//       posts,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

export const getBulkPostsForWholesaler = async (req, res) => {
  try {
    // ==========================
    // Role Check
    // ==========================
    if (req.user.role !== "wholesaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    // ==========================
    // User Location
    // ==========================
    const userDistrict = req.user.district?.trim();
    const userThana = req.user.thana?.trim();

    if (!userDistrict || !userThana) {
      return res.status(400).json({
        message: "User district and thana are required",
      });
    }

    // ==========================
    // Fetch Bulk Sell Posts
    // ==========================
    const posts = await SellPost.find({
      sellType: "bulk",

      // only active listings
      isActive: true,

      // stock available only
      remainingQuantity: { $gt: 0 },

      // location match
      district: userDistrict,
      thana: userThana,

      // visibility rules
      visibility: { $in: ["all", "wholesaler"] },
    })
      .populate("product", "productName image price description category")
      .populate("producer", "name phone")
      .sort({ createdAt: -1 });

    // ==========================
    // Response
    // ==========================
    return res.status(200).json({
      message: "Bulk posts fetched successfully",
      totalFound: posts.length,
      posts,
    });
  } catch (error) {
    console.error("getBulkPostsForWholesaler error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Single Product Details For Wholesaler
export const getProductDetailsForWholesaler = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      status: "approved",
    })
      .populate("producer", "name email phone division district thana")
      .populate("category", "name");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product details fetched successfully",
      product,
    });
  } catch (error) {
    console.error("Error fetching product details:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// Get Single Bulk Post Details For Wholesaler
export const getBulkPostDetailsForWholesaler = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { postId } = req.params;

    const post = await SellPost.findOne({
      _id: postId,
      sellType: "bulk",
      isActive: true,
      remainingQuantity: { $gt: 0 },
      visibility: { $in: ["all", "wholesaler"] },
    })
      .populate({
        path: "product",
        populate: {
          path: "category",
          select: "name",
        },
      })
      .populate("seller", "name email phone division district thana");

    if (!post) {
      return res.status(404).json({
        message: "Bulk post not found",
      });
    }

    return res.status(200).json({
      message: "Bulk post details fetched successfully",
      post,
    });
  } catch (error) {
    console.error("Error fetching bulk post details:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// create bulk order for wholesaler

import BulkOrder from "../../models/BulkOrder.js";
// import SellPost from "../../models/SellPost.js";

export const createBulkOrder = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { sellPostId, quantity, notes } = req.body;

    const sellPost = await SellPost.findById(sellPostId)
      .populate("product")
      .populate("seller");

    if (!sellPost) {
      return res.status(404).json({
        message: "Sell post not found",
      });
    }

    if (!sellPost.isActive) {
      return res.status(400).json({
        message: "This post is not active",
      });
    }

    if (quantity > sellPost.remainingQuantity) {
      return res.status(400).json({
        message: `Only ${sellPost.remainingQuantity} available`,
      });
    }

    // ✅ FIX HERE (IMPORTANT)
    const unitPrice =
      sellPost.pricePerUnit ||
      sellPost.unitPrice ||
      sellPost.product?.price;

    if (!unitPrice) {
      return res.status(400).json({
        message: "Unit price not found in sell post",
      });
    }

    const totalAmount = Number(unitPrice) * Number(quantity);

    if (isNaN(totalAmount)) {
      return res.status(400).json({
        message: "Invalid price calculation",
      });
    }

    const order = await BulkOrder.create({
      orderId: `BULK-${Date.now()}`,
      wholesaler: req.user.id,
      producer: sellPost.seller._id,
      sellPost: sellPost._id,
      product: sellPost.product._id,
      quantity,
      unitPrice,
      totalAmount,
      notes,
    });

    res.status(201).json({
      message: "Bulk order created successfully",
      order,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



export const getWholesalerOwnOrders = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { status } = req.query;

    // Build filter
    const filter = {
      wholesaler: req.user.id,
    };

    // Optional status filter
    if (status) {
      filter.orderStatus = status;
    }

    const orders = await BulkOrder.find(filter)
      .populate("product", "productName image price")
      .populate("sellPost", "title pricePerUnit remainingQuantity")
      .populate("producer", "name phone email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Wholesaler orders fetched successfully",
      total: orders.length,
      orders,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



export const getWholesalerOrderProducts = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { status } = req.query;

    const filter = {
      wholesaler: req.user.id,
    };

    if (status) {
      filter.orderStatus = status;
    }

    const orders = await BulkOrder.find(filter)
      .populate("product", "productName image price category addToSellPost")
      .populate("sellPost", "pricePerUnit remainingQuantity")
      .populate("producer", "name phone")
      .sort({ createdAt: -1 });

    // 🔥 Convert orders → product view
    const products = orders.map((order) => ({
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      totalAmount: order.totalAmount,

      product: order.product,

      producer: order.producer,

      sellPost: order.sellPost,

      createdAt: order.createdAt,
    }));

    res.status(200).json({
      message: "Wholesaler order products fetched successfully",
      total: products.length,
      products,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const markWholesalerOrderProductSoldOffline = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { orderId } = req.params;

    const order = await BulkOrder.findOne({
      orderId,
      wholesaler: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Product order not found",
      });
    }

    await BulkOrder.deleteOne({ _id: order._id });

    return res.status(200).json({
      message: "Product marked as sold offline and removed permanently",
    });
  } catch (error) {
    console.error("markWholesalerOrderProductSoldOffline error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



// import BulkOrder from "../../models/BulkOrder.js";

export const payBulkOrderCOD = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { orderId } = req.params;

    const order =
      (await BulkOrder.findOne({ orderId })) ||
      (await BulkOrder.findById(orderId));

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // 🛡️ FIX: prevent crash if field missing
    if (!order.wholesaler) {
      return res.status(400).json({
        message: "Invalid order data (missing wholesaler)",
      });
    }

    // 🔒 ownership check (SAFE)
    if (order.wholesaler.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: "You cannot access this order",
      });
    }

    // COD check
    if (order.paymentMethod !== "cash_on_delivery") {
      return res.status(400).json({
        message: "This order is not COD payment method",
      });
    }

    // already paid
    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        message: "Order already marked as paid",
      });
    }

    order.paymentStatus = "paid";
    order.paymentPaidAt = new Date();

    await order.save();

    return res.status(200).json({
      message: "COD payment marked as paid successfully",
      order,
    });
  } catch (error) {
    console.error("COD PAYMENT ERROR:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
