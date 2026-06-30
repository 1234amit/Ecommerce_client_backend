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
import {
  DELIVERY_CHARGE,
  PROFIT_RATES,
  applyPricingToProduct,
  applyPricingToSellPost,
  buildPricingBreakdown,
} from "../../services/pricingService.js";
import { verifyOtpToken } from "../../services/otpService.js";

const parseQuantityNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

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

const isAdminApprovedOrder = (order = {}) => {
  const orderStatus = String(order.orderStatus || "").toLowerCase();
  const paymentStatus = String(order.paymentStatus || "").toLowerCase();
  const adminActionStatus = String(order.adminActionStatus || "").toLowerCase();

  return (
    paymentStatus === "paid" ||
    orderStatus === "confirmed" ||
    orderStatus === "delivered" ||
    orderStatus === "completed" ||
    adminActionStatus === "confirmed"
  );
};

const normalizeOrderForResponse = (order = {}) => {
  const plain = typeof order.toObject === "function"
    ? order.toObject({ virtuals: true })
    : { ...order };

  if (isAdminApprovedOrder(plain)) {
    plain.orderStatus = "delivered";
    plain.paymentStatus = "paid";
    plain.paymentStatusDisplay = "Paid";
    plain.statusDisplay = "Delivered";
    plain.adminActionStatus = plain.adminActionStatus || "confirmed";
  }

  return plain;
};

const syncApprovedOrdersAsPaid = async (orders = []) => {
  const idsToRepair = orders
    .filter((order) => isAdminApprovedOrder(order) && order.paymentStatus !== "paid")
    .map((order) => order._id)
    .filter(Boolean);

  if (idsToRepair.length) {
    await Order.updateMany(
      { _id: { $in: idsToRepair } },
      {
        $set: {
          orderStatus: "delivered",
          paymentStatus: "paid",
          adminActionStatus: "confirmed",
        },
      }
    );

    orders.forEach((order) => {
      if (idsToRepair.some((id) => String(id) === String(order._id))) {
        order.orderStatus = "delivered";
        order.paymentStatus = "paid";
        order.adminActionStatus = "confirmed";
      }
    });
  }

  return orders.map(normalizeOrderForResponse);
};

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

    const imageUrl = getImageUrlFromRequest(req);
    if (imageUrl) updateData.image = imageUrl;

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

    const imageUrl = getImageUrlFromRequest(req);
    if (!imageUrl) {
      return res.status(400).json({ message: "No image provided" });
    }

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
    const { oldPassword, newPassword, otpToken } = req.body || {};

    if (!supersalerId) return res.status(401).json({ message: "Unauthorized" });
    if (typeof oldPassword !== "string" || typeof newPassword !== "string" || !oldPassword.trim() || !newPassword.trim())
      return res.status(400).json({ message: "oldPassword and newPassword are required" });
    if (oldPassword === newPassword)
      return res.status(400).json({ message: "New password must be different from old password" });

    const supersaler = await User.findById(supersalerId).select("+password");
    if (!supersaler) return res.status(404).json({ message: "Supersaler not found" });

    if (!verifyOtpToken({ token: otpToken, phone: supersaler.phone, purpose: "password-reset" })) {
      return res.status(403).json({ message: "OTP verification is required" });
    }

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
      {
        $match: {
          status: "approved",
          addToSellPost: "yes",
        },
      },

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
          "producer.role": "producer",
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

    const pricedProducts = products
      .filter((product) => parseQuantityNumber(product.quantity) > 0)
      .map((product) => applyPricingToProduct(product, PROFIT_RATES.producerBulkToSupersaler));

    res.json({
      message: "Approved products fetched successfully",
      products: pricedProducts,
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

      const quantity = Number(item.quantity || 0);
      const pricing = buildPricingBreakdown({
        basePrice: product.price || 0,
        quantity,
        ratePercent: PROFIT_RATES.producerBulkToSupersaler,
      });

      return {
        productId: product._id,
        productName: productName,
        productImage: productImage,
        basePrice: pricing.basePrice,
        profitRate: pricing.profitRate,
        adminProfit: pricing.adminProfit,
        price: pricing.finalPrice,
        quantity: quantity,
        totalPrice: pricing.subtotal,
      };
    });

    // ===========================
    // 3) Calculate subtotal
    // ===========================
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const baseSubtotal = orderItems.reduce(
      (sum, item) => sum + Number(item.basePrice || 0) * Number(item.quantity || 0),
      0
    );
    const adminProfit = orderItems.reduce((sum, item) => sum + Number(item.adminProfit || 0), 0);

    // ===========================
    // 4) Create Order
    // ===========================
    const order = await Order.create({
      userId: supersalerId,
      items: orderItems,
      baseSubtotal,
      adminProfit,
      profitRate: PROFIT_RATES.producerBulkToSupersaler,
      subtotal: subtotal,
      deliveryFee: DELIVERY_CHARGE,
      totalAmount: subtotal + DELIVERY_CHARGE,
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
    const normalizedOrders = await syncApprovedOrdersAsPaid(orders);

    return res.status(200).json({
      message: "Supersaler buy orders fetched successfully",
      orders: normalizedOrders,
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


export const getSupersalerOrders = async (req, res) => {
  try {
    const supersalerId = req.user.id;

    const orders = await Order.find({
      userId: supersalerId,
      isActive: true,
    })
      .populate("items.productId")
      .populate("adminActionBy", "name email")
      .sort({ createdAt: -1 });
    const normalizedOrders = await syncApprovedOrdersAsPaid(orders);

    return res.status(200).json({
      message: "All purchase orders fetched",
      orders: normalizedOrders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// export const getSupersalerOwnProducts = async (req, res) => {
//   try {
//     // ==========================
//     // Role Check
//     // ==========================
//     if (req.user.role !== "supersaler") {
//       return res.status(403).json({
//         message: "Unauthorized access",
//       });
//     }

//     const supersalerId = req.user._id;

//     // ==========================
//     // Fetch Own Products
//     // ==========================
//     const products = await Product.find({
//       producer: supersalerId,
//     })
//       .populate("category", "name")
//       .populate("approvedBy", "name email")
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       message: "Supersaler products fetched successfully",
//       totalProducts: products.length,
//       products,
//     });
//   } catch (error) {
//     console.error("getSupersalerOwnProducts error:", error);

//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };




// getBulkPosts 


export const getSupersalerOwnProducts = async (req, res) => {
  try {
    // ==========================
    // Role Check
    // ==========================
    if (req.user.role !== "supersaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const supersalerId = req.user._id;

    // ==========================
    // 1. Get Supersaler Own Products
    // ==========================
    const ownProducts = await Product.find({
      producer: supersalerId,
    })
      .populate("category", "name")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    // ==========================
    // RESPONSE
    // ==========================
    return res.status(200).json({
      message: "Supersaler products fetched successfully",
      totalProducts: ownProducts.length,
      products: ownProducts,
    });
  } catch (error) {
    console.error("getSupersalerOwnProducts error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// export const getSupersalerPurchasedProducts = async (req, res) => {
//   try {
//     if (req.user.role !== "supersaler") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const supersalerId = req.user._id;

//     // 🔥 DIRECTLY GET ORDERS (NO PAYMENT TABLE)
//     const orders = await Order.find({
//       isActive: true,
//       paymentStatus: "paid",
//     })
//       .populate({
//         path: "items.productId",
//         populate: [
//           { path: "category", select: "name" },
//           { path: "approvedBy", select: "name email" },
//         ],
//       })
//       .lean();

//     const purchasedProducts = [];

//     orders.forEach(order => {
//       (order.items || []).forEach(item => {
//         if (item.productId) {
//           purchasedProducts.push({
//             ...item.productId,
//             purchasedQuantity: item.quantity,
//             purchasedPrice: item.price,
//             purchasedFromOrder: order.orderId,
//             purchasedAt: order.createdAt,
//             isPurchased: true,
//           });
//         }
//       });
//     });

//     return res.status(200).json({
//       message: "Purchased products fetched successfully",
//       totalPurchased: purchasedProducts.length,
//       products: purchasedProducts,
//     });

//   } catch (error) {
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };


export const getSupersalerPurchasedProducts = async (req, res) => {
  try {
    if (req.user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const supersalerId = req.user._id;

    // 1. Get paid orders (ONLY order is source of truth)
    const orders = await Order.find({
      userId: supersalerId,
      isActive: true,
      $or: [
        { paymentStatus: "paid" },
        { orderStatus: { $in: ["confirmed", "delivered", "completed"] } },
        { adminActionStatus: "confirmed" },
      ],
    })
      .populate({
        path: "items.productId",
        populate: [
          { path: "category", select: "name" },
          { path: "approvedBy", select: "name email" },
        ],
      })
      .lean({ virtuals: true });

    const normalizedOrders = await syncApprovedOrdersAsPaid(orders);

    // 2. Unique product map (IMPORTANT)
    const purchasedMap = new Map();

    normalizedOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const product = item.productId;

        if (!product || !product._id) return;

        const productId = product._id.toString();

        // If already exists → merge quantity (VERY IMPORTANT FIX)
        if (purchasedMap.has(productId)) {
          const existing = purchasedMap.get(productId);

          purchasedMap.set(productId, {
            ...existing,
            purchasedQuantity:
              (existing.purchasedQuantity || 0) + (item.quantity || 0),
          });
        } else {
          purchasedMap.set(productId, {
            ...product,
            purchasedQuantity: item.quantity || 0,
            purchasedPrice: item.price || 0,
            purchasedFromOrder: order.orderId,
            purchasedAt: order.createdAt,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            paymentStatusDisplay: order.paymentStatusDisplay,
            adminActionStatus: order.adminActionStatus,
            isPurchased: true,
          });
        }
      });
    });

    const purchasedProducts = Array.from(purchasedMap.values());

    return res.status(200).json({
      message: "Purchased products fetched successfully",
      totalPurchased: purchasedProducts.length,
      products: purchasedProducts,
    });

  } catch (error) {
    console.error("Purchased Products Error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

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

    const pricedPosts = posts.map((post) =>
      applyPricingToSellPost(post, PROFIT_RATES.supersalerBulkToWholesaler)
    );

    res.json({ message: "Bulk posts fetched", posts: pricedPosts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




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

    const pricedPosts = posts.map((post) =>
      applyPricingToSellPost(post, PROFIT_RATES.supersalerBulkToWholesaler)
    );

    return res.json({
      message: "Bulk posts fetched successfully for supersaler",
      totalFound: pricedPosts.length,
      posts: pricedPosts,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};




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
      unit,
      price,
      description,
      category,
      productType,
      addToSellPost,
      secondaryImages,
      image,
    } = req.body;

    // ==========================
    // Validation
    // ==========================
    if (
      !productName ||
      !quantity ||
      !price ||
      !description ||
      !category ||
      !productType
    ) {
      return res.status(400).json({
        message:
          "productName, quantity, price, description, category, productType are required",
      });
    }

    const validProductTypes = ["bulk", "rental"];

    if (!validProductTypes.includes(productType)) {
      return res.status(400).json({
        message: "Invalid productType. productType must be bulk or rental",
      });
    }

    // ==========================
    // Image Handling
    // ==========================
    let mainImage = null;

    if (req.file) {
      mainImage = req.file.path;
    } else if (image) {
      mainImage = image;
    }

    if (!mainImage) {
      return res.status(400).json({ message: "Product image is required" });
    }

    // ==========================
    // Secondary Images Handling
    // ==========================
    let parsedSecondaryImages = [];

    if (secondaryImages) {
      if (Array.isArray(secondaryImages)) {
        parsedSecondaryImages = secondaryImages;
      } else {
        try {
          parsedSecondaryImages = JSON.parse(secondaryImages);
        } catch (error) {
          parsedSecondaryImages = [];
        }
      }
    }

    // ==========================
    // Create Product as Pending
    // ==========================
    const newProduct = await Product.create({
      producer: req.user._id,

      image: mainImage,
      secondaryImages: parsedSecondaryImages,

      productName: productName.trim(),
      quantity: quantity.toString(),
      unit: unit ? String(unit) : "",
      price: price.toString(),
      previousPrice: price.toString(),

      description: description.trim(),
      category,

      productType,

      addToSellPost: addToSellPost || "no",

      status: "pending",
      approvedBy: null,
      approvedAt: null,
    });

    return res.status(201).json({
      message: "Product added successfully. Waiting for admin approval.",
      product: newProduct,
    });
  } catch (error) {
    console.error("addSupersalerProduct error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getSupersalerOwnProductById = async (req, res) => {
  try {
    if (req.user.role !== "supersaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      producer: req.user._id,
    })
      .populate("category", "name")
      .populate("approvedBy", "name email");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    console.error("getSupersalerOwnProductById error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateSupersalerOwnProduct = async (req, res) => {
  try {
    if (req.user.role !== "supersaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      producer: req.user._id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const {
      productName,
      quantity,
      price,
      description,
      category,
      productType,
      addToSellPost,
      secondaryImages,
      image,
    } = req.body;

    if (productName) {
      product.productName = productName.trim();
    }

    if (quantity) {
      const nextQuantity = parseQuantityNumber(quantity);
      const currentQuantity = parseQuantityNumber(product.quantity);

      if (product.sourceProduct && nextQuantity > currentQuantity) {
        return res.status(400).json({
          message: "Quantity cannot exceed your owned stock",
        });
      }

      product.quantity = quantity.toString();
    }

    if (price) {
      product.previousPrice = product.price;
      product.price = price.toString();
    }

  if (description !== undefined) {
  product.description =
    typeof description === "string"
      ? description.trim()
      : (description?.html || description?.text || "").trim();
}

    if (category) {
      product.category = category;
    }

    if (productType) {
      const validTypes = ["bulk", "rental"];

      if (!validTypes.includes(productType)) {
        return res.status(400).json({
          message: "Invalid productType",
        });
      }

      product.productType = productType;
    }

    if (addToSellPost) {
      product.addToSellPost = addToSellPost;
    }

    // Main Image
    if (req.file) {
      product.image = req.file.path;
    } else if (image) {
      product.image = image;
    }

    // Secondary Images
    if (secondaryImages) {
      if (Array.isArray(secondaryImages)) {
        product.secondaryImages = secondaryImages;
      } else {
        try {
          product.secondaryImages = JSON.parse(secondaryImages);
        } catch (err) {
        }
      }
    }

    // Optional:
    // Re-approval after update
    product.status = "pending";
    product.approvedBy = null;
    product.approvedAt = null;

    await product.save();

    return res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("updateSupersalerOwnProduct error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



export const deleteSupersalerOwnProduct = async (req, res) => {
  try {
    if (req.user.role !== "supersaler") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      producer: req.user._id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await Product.findByIdAndDelete(product._id);

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("deleteSupersalerOwnProduct error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
