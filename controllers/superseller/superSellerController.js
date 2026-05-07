import Product from "../../models/Product.js";
import SellPost from "../../models/SellPost.js";
import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import Order from "../../models/Order.js";
// import Order from "../../models/Order.js";
import Payment from "../../models/Payment.js";
import Cart from "../../models/Cart.js";
import SupersalerBuyProductCart from "../../models/supersalerBuyProductCart.js";
import mongoose from "mongoose";


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

    const supersalerDistrict = req.user.district;
    const supersalerThana = req.user.thana;

    const products = await Product.aggregate([
      { $match: { status: "approved" } },

      {
        $lookup: {
          from: "users",
          localField: "producer",
          foreignField: "_id",
          as: "producer",
        },
      },
      { $unwind: "$producer" },

      {
        $match: {
          "producer.district": supersalerDistrict,
          "producer.thana": supersalerThana,
        },
      },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      { $sort: { createdAt: -1 } },
    ]);

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

// import mongoose from "mongoose";
// import Order from "../../models/Order.js";
// import Payment from "../../models/Payment.js";
// import SupersalerBuyProductCart from "../../models/SupersalerBuyProductCart.js";

export const supersalerCheckoutCOD = async (req, res) => {
  try {
    const supersalerId = req.user.id; // from token

    // ===========================
    // 1) Find Cart
    // ===========================
    const cart = await SupersalerBuyProductCart.findOne({
      supersaler: supersalerId,
    }).populate({
      path: "items.product",
      populate: { path: "producer" },
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // ===========================
    // 2) Create Order Items
    // ===========================
    const orderItems = cart.items.map((item) => {
      const product = item.product;

      const productName =
        product.productName ||
        product.name ||
        product.title ||
        product.product_title ||
        "Unknown Product";

      const productImage =
        product.image ||
        product.productImage ||
        (Array.isArray(product.images) ? product.images[0] : null) ||
        (Array.isArray(product.productImages) ? product.productImages[0] : null) ||
        "no-image";

      const price = Number(product.price || 0);
      const quantity = Number(item.quantity || 0);
      const totalPrice = price * quantity;

      return {
        productId: product._id,
        productName: productName,
        productImage: productImage,
        price: price,
        quantity: quantity,
        totalPrice: totalPrice,
      };
    });

    // ===========================
    // 3) Calculate subtotal
    // ===========================
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // ===========================
    // 4) Create Order
    // ===========================
    const order = await Order.create({
      userId: supersalerId,
      items: orderItems,
      subtotal: subtotal,
      deliveryFee: 0,
      totalAmount: subtotal,
      paymentMethod: "cash_on_delivery",
      paymentStatus: "pending",
      orderStatus: "pending",

      // Optional notes
      orderNotes: "Supersaler COD order",
    });

    // ===========================
    // 5) Create Payment
    // ===========================
    const payment = await Payment.create({
      userId: supersalerId,
      orderId: order.orderId, // using your custom orderId (ORD-...)
      method: "cash_on_delivery",
      amount: order.totalAmount,
      status: "pending",
      notes: "COD order payment created",
    });

    // ===========================
    // 6) Empty Cart
    // ===========================
    await SupersalerBuyProductCart.deleteOne({ supersaler: supersalerId });

    // ===========================
    // 7) Response
    // ===========================
    return res.status(201).json({
      message: "Order placed successfully with Cash on Delivery",
      order,
      payment,
    });
  } catch (error) {
    console.error("COD Checkout Error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// export const getSupersalerBuyOrders = async (req, res) => {
//   try {
//     const supersalerId = req.user.id;

//     const orders = await Order.find({
//       userId: supersalerId,
//       isActive: true,
//     })
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       message: "Supersaler buy orders fetched successfully",
//       orders,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

export const getSupersalerBuyOrders = async (req, res) => {
  try {
    const supersalerId = req.user.id;

    const orders = await Order.find({
      userId: supersalerId,
      isActive: true,
    })
      .populate("items.productId") // populate product details
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Supersaler buy orders fetched successfully",
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


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


export const getSupersalerPurchases = async (req, res) => {
  try {
    const supersalerId = req.user.id;

    const orders = await Order.find({
      userId: supersalerId,
      isActive: true,
    })
      .populate("items.productId")
      .populate("adminActionBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "All purchase orders fetched",
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};




// getBulkPosts 

export const getBulkPosts = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler" && req.user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const posts = await SellPost.find({
      sellType: "bulk",
      isActive: true,
      district: req.user.district,
      thana: req.user.thana,
    })
      .populate("product", "productName image category")
      .populate("seller", "name phone")
      .sort({ createdAt: -1 });

    res.json({ message: "Bulk posts fetched", posts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// import SellPost from "../../models/SellPost.js";

export const getBulkPostsForSupersaler = async (req, res) => {
  try {
    if (req.user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userDistrict = req.user.district?.trim().toLowerCase();
    const userThana = req.user.thana?.trim().toLowerCase();

    if (!userDistrict || !userThana) {
      return res.status(400).json({
        message: "User district and thana missing",
      });
    }

    const posts = await SellPost.find({
      sellType: "bulk",
      isActive: true,
      visibility: "all",
      district: { $regex: new RegExp(`^${userDistrict}$`, "i") },
      thana: { $regex: new RegExp(`^${userThana}$`, "i") },
    })
      .populate("product", "productName image pricePerKg unit")
      .populate("seller", "name phone district thana role")
      .populate("producer", "name phone district thana role")
      .sort({ createdAt: -1 });

    return res.json({
      message: "Bulk posts fetched successfully for supersaler",
      totalFound: posts.length,
      posts,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



// import mongoose from "mongoose";
// import SellPost from "../../models/SellPost.js";


// export const getBulkPostsForSupersaler = async (req, res) => {
//   try {
//     if (req.user.role !== "supersaler") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const userDistrict = req.user.district?.trim();
//     const userThana = req.user.thana?.trim();

//     if (!userDistrict || !userThana) {
//       return res.status(400).json({
//         message: "User district and thana missing",
//       });
//     }

//     const posts = await SellPost.find({
//       sellType: "bulk",
//       isActive: true,

//       // ✅ FIXED visibility logic
//       visibility: { $in: ["all", "supersaler"] },

//       // ✅ safer matching (case insensitive)
//       district: { $regex: new RegExp(`^${userDistrict}$`, "i") },
//       thana: { $regex: new RegExp(`^${userThana}$`, "i") },

//       seller: { $ne: req.user._id },
//       remainingQuantity: { $gt: 0 },
//     })
//       .populate("product", "productName image pricePerKg unit")
//       .populate("seller", "name phone district thana role")
//       .populate("producer", "name phone district thana role")
//       .sort({ createdAt: -1 });

//     return res.json({
//       message: "Bulk posts fetched successfully for supersaler",
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


// import Product from "../../models/Product.js";


export const addSupersalerProduct = async (req, res) => {
  try {
    // ==========================
    // Role Check
    // ==========================
    if (req.user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const {
      productName,
      quantity,
      price,
      description,
      category,
      addToSellPost,
      secondaryImages,
      image,
    } = req.body;

    // ==========================
    // Validation
    // ==========================
    if (!productName || !quantity || !price || !description || !category) {
      return res.status(400).json({
        message:
          "productName, quantity, price, description, category are required",
      });
    }

    // ==========================
    // Image Handling
    // ==========================
    let mainImage = null;

    if (req.file) {
      mainImage = req.file.path; // multer file
    } else if (image) {
      mainImage = image; // body image string
    }

    if (!mainImage) {
      return res.status(400).json({ message: "Product image is required" });
    }

    // ==========================
    // Create Product
    // ==========================
    const newProduct = await Product.create({
      producer: req.user._id, // supersaler becomes producer in this model

      image: mainImage,
      secondaryImages: secondaryImages || [],

      productName: productName.trim(),
      quantity: quantity.toString(),
      price: price.toString(),
      previousPrice: price.toString(),

      description: description.trim(),
      category,

      addToSellPost: addToSellPost || "no",

      // you can choose pending or approved
      status: "approved",
      approvedBy: req.user._id,
      approvedAt: new Date(),
    });

    return res.status(201).json({
      message: "Product added successfully by supersaler",
      product: newProduct,
    });
  } catch (error) {
    console.error("addProductBySupersaler error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


