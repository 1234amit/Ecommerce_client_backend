// import SellPost from "../../models/SellPost.js";
// import Product from "../../models/Product.js";
// import CommissionSetting from "../../models/CommissionSetting.js";

// // export const createSellPost = async (req, res) => {
// //   try {
// //     if (req.user.role !== "supersaler") {
// //       return res.status(403).json({ message: "Unauthorized access" });
// //     }

// //     const { productId, sellType, quantity, unit, sellingPricePerKg } = req.body;

// //     if (!productId || !sellType || !quantity || !unit || !sellingPricePerKg) {
// //       return res.status(400).json({ message: "All fields are required" });
// //     }

// //     const product = await Product.findById(productId).populate("producer");

// //     if (!product) {
// //       return res.status(404).json({ message: "Product not found" });
// //     }

// //     if (product.status !== "approved") {
// //       return res.status(400).json({ message: "Product is not approved yet" });
// //     }

// //     // supersaler can only sell same district/thana
// //     if (
// //       product.producer.district !== req.user.district ||
// //       product.producer.thana !== req.user.thana
// //     ) {
// //       return res.status(403).json({
// //         message: "You can only sell products from your district and thana",
// //       });
// //     }

// //     // base price from producer product
// //     const basePricePerKg = product.pricePerKg;

// //     // load commission settings
// //     let settings = await CommissionSetting.findOne();
// //     if (!settings) {
// //       settings = await CommissionSetting.create({
// //         retailCommissionPercent: 2,
// //         bulkCommissionPercent: 1,
// //       });
// //     }

// //     let commissionPercent = 0;
// //     let visibility = "consumer";

// //     if (sellType === "retail") {
// //       commissionPercent = settings.retailCommissionPercent;
// //       visibility = "consumer"; // consumer can see
// //     } else if (sellType === "bulk") {
// //       commissionPercent = settings.bulkCommissionPercent;
// //       visibility = "all"; // wholesaler + supersaler can see
// //     } else {
// //       return res.status(400).json({ message: "Invalid sellType" });
// //     }

// //     const newSellPost = new SellPost({
// //       product: product._id,
// //       producer: product.producer._id,
// //       seller: req.user._id,
// //       sellerRole: "supersaler",

// //       sellType,
// //       quantity: Number(quantity),
// //       unit,

// //       basePricePerKg: Number(basePricePerKg),
// //       sellingPricePerKg: Number(sellingPricePerKg),

// //       commissionPercent,
// //       district: req.user.district,
// //       thana: req.user.thana,
// //       visibility,
// //     });

// //     const saved = await newSellPost.save();

// //     res.status(201).json({
// //       message: `${sellType} post created successfully`,
// //       sellPost: saved,
// //     });
// //   } catch (error) {
// //     console.error("SellPost create error:", error);
// //     res.status(500).json({ message: "Server error", error: error.message });
// //   }
// // };


// export const createSellPost = async (req, res) => {
//   try {
//     if (req.user.role !== "supersaler") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const { productId, sellType, quantity, unit, sellingPricePerKg } = req.body;

//     if (!productId || !sellType || !quantity || !unit || !sellingPricePerKg) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const product = await Product.findById(productId).populate("producer");

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     if (product.status !== "approved") {
//       return res.status(400).json({ message: "Product is not approved" });
//     }

//     // ✅ district thana match
//     if (
//       product.producer.district !== req.user.district ||
//       product.producer.thana !== req.user.thana
//     ) {
//       return res.status(403).json({
//         message: "You can only sell products from your district and thana",
//       });
//     }

//     // 🔥 load commission settings
//     let setting = await CommissionSetting.findOne();
//     if (!setting) {
//       setting = await CommissionSetting.create({
//         retailCommissionPercent: 2,
//         bulkCommissionPercent: 1,
//       });
//     }

//     let commissionPercent = 0;
//     let visibility = "consumer";

//     if (sellType === "retail") {
//       commissionPercent = setting.retailCommissionPercent;
//       visibility = "consumer";
//     } else if (sellType === "bulk") {
//       commissionPercent = setting.bulkCommissionPercent;
//       visibility = "all";
//     } else {
//       return res.status(400).json({ message: "Invalid sellType" });
//     }

//     const newPost = new SellPost({
//       product: product._id,
//       producer: product.producer._id,
//       seller: req.user._id,
//       sellerRole: "supersaler",

//       sellType,
//       quantity: Number(quantity),
//       unit,

//       basePricePerKg: Number(product.pricePerKg),
//       sellingPricePerKg: Number(sellingPricePerKg),

//       commissionPercent,
//       district: req.user.district,
//       thana: req.user.thana,
//       visibility,
//     });

//     const savedPost = await newPost.save();

//     return res.status(201).json({
//       message: `${sellType} post created successfully`,
//       sellPost: savedPost,
//       calculation: {
//         sellingPricePerKg: savedPost.sellingPricePerKg,
//         commissionPercent: savedPost.commissionPercent,
//         commissionAmountPerKg: savedPost.commissionAmountPerKg,
//         totalCommission: savedPost.totalCommission,
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };



// // calculation: 

// // Supersaler sells at 12 tk/kg
// // Retail commission = 2%

// // Commission per kg:

// // 12 × 2% = 0.24 tk (24 paisa)

// // If quantity = 50kg:

// // 0.24 × 50 = 12 tk admin commission


import SellPost from "../../models/SellPost.js";
import Product from "../../models/Product.js";
import CommissionSetting from "../../models/CommissionSetting.js";
import Order from "../../models/Order.js";

export const createSellPost = async (req, res) => {
  try {
    if (req.user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const supersalerId = req.user._id;

    const { productId, sellType, quantity, unit, sellingPricePerKg } = req.body;

    if (!productId || !sellType || !quantity || !unit || !sellingPricePerKg) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["retail", "bulk"].includes(sellType)) {
      return res.status(400).json({ message: "Invalid sellType. Use retail or bulk" });
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    if (Number(sellingPricePerKg) <= 0) {
      return res.status(400).json({ message: "Selling price must be greater than 0" });
    }

    // ===============================
    // 1) Product Check
    // ===============================
    const product = await Product.findById(productId).populate("producer");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.status !== "approved") {
      return res.status(400).json({ message: "Product is not approved" });
    }

    // Producer must match supersaler district/thana
    if (
      product.producer.district !== req.user.district ||
      product.producer.thana !== req.user.thana
    ) {
      return res.status(403).json({
        message: "You can only sell products from your district and thana",
      });
    }

    // ===============================
    // 2) Check Supersaler Bought This Product
    // ===============================
    const boughtOrders = await Order.find({
      userId: supersalerId,
      "items.productId": product._id,
      orderStatus: { $ne: "cancelled" },
    });

    if (!boughtOrders || boughtOrders.length === 0) {
      return res.status(403).json({
        message: "You can only create sell post for products you purchased",
      });
    }

    // ===============================
    // 3) Calculate total bought quantity
    // ===============================
    let totalBoughtQty = 0;

    boughtOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.productId.toString() === product._id.toString()) {
          totalBoughtQty += Number(item.quantity || 0);
        }
      });
    });

    // ===============================
    // 4) Calculate already posted quantity
    // ===============================
    // const existingPosts = await SellPost.find({
    //   seller: supersalerId,
    //   product: product._id,
    //   isActive: true,
    // });

    // let totalPostedQty = 0;
    // existingPosts.forEach((post) => {
    //   totalPostedQty += Number(post.quantity || 0);
    // });

    // const availableQty = totalBoughtQty - totalPostedQty;

    // if (Number(quantity) > availableQty) {
    //   return res.status(400).json({
    //     message: `Not enough stock. Available stock: ${availableQty}`,
    //     totalBoughtQty,
    //     totalPostedQty,
    //     availableQty,
    //   });
    // }


    // ===============================
    // 4) Calculate already posted quantity
    // ===============================
    const existingPosts = await SellPost.find({
      seller: supersalerId,
      product: product._id,
      isActive: true,
      sellType: sellType, // 🔥 retail/bulk separate
    });

    let totalPostedQty = 0;
    existingPosts.forEach((post) => {
      totalPostedQty += Number(post.remainingQuantity || 0);
    });

    const availableQty = totalBoughtQty - totalPostedQty;

    if (Number(quantity) > availableQty) {
      return res.status(400).json({
        message: `Not enough stock. Available stock: ${availableQty}`,
        totalBoughtQty,
        totalPostedQty,
        availableQty,
      });
    }

    // ===============================
    // 5) Load Commission Settings
    // ===============================
    let setting = await CommissionSetting.findOne();
    if (!setting) {
      setting = await CommissionSetting.create({
        retailCommissionPercent: 2,
        bulkCommissionPercent: 1,
      });
    }

    let commissionPercent = 0;
    let visibility = "consumer";

    // if (sellType === "retail") {
    //   commissionPercent = setting.retailCommissionPercent;
    //   visibility = "consumer"; // consumer can see/buy
    // } else if (sellType === "bulk") {
    //   commissionPercent = setting.bulkCommissionPercent;
    //   visibility = "wholesaler_supersaler"; // only wholesaler + supersaler
    // }

    if (sellType === "retail") {
      commissionPercent = setting.retailCommissionPercent;
      visibility = "consumer";
    } else if (sellType === "bulk") {
      commissionPercent = setting.bulkCommissionPercent;
      visibility = "all"; // wholesaler + supersaler can see/buy
    }

    // ===============================
    // 6) Create SellPost
    // ===============================
    const newPost = new SellPost({
      product: product._id,
      producer: product.producer._id,
      seller: supersalerId,
      sellerRole: "supersaler",

      sellType,
      quantity: Number(quantity),
      unit,

      basePricePerKg: Number(product.pricePerKg),
      sellingPricePerKg: Number(sellingPricePerKg),

      commissionPercent,
      district: req.user.district,
      thana: req.user.thana,
      visibility,
      isActive: true,
    });

    const savedPost = await newPost.save();

    return res.status(201).json({
      message: `${sellType} post created successfully`,
      sellPost: savedPost,
      stock: {
        totalBoughtQty,
        totalPostedQty,
        availableQty,
        newRemainingQty: availableQty - Number(quantity),
      },
      calculation: {
        sellingPricePerKg: savedPost.sellingPricePerKg,
        commissionPercent: savedPost.commissionPercent,
        commissionAmountPerKg: savedPost.commissionAmountPerKg,
        totalCommission: savedPost.totalCommission,
      },
    });
  } catch (error) {
    console.error("SellPost create error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};