import SellPost from "../../models/SellPost.js";
import Product from "../../models/Product.js";
import CommissionSetting from "../../models/CommissionSetting.js";

export const createSellPost = async (req, res) => {
  try {
    if (req.user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { productId, sellType, quantity, unit, sellingPricePerKg } = req.body;

    if (!productId || !sellType || !quantity || !unit || !sellingPricePerKg) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const product = await Product.findById(productId).populate("producer");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.status !== "approved") {
      return res.status(400).json({ message: "Product is not approved yet" });
    }

    // supersaler can only sell same district/thana
    if (
      product.producer.district !== req.user.district ||
      product.producer.thana !== req.user.thana
    ) {
      return res.status(403).json({
        message: "You can only sell products from your district and thana",
      });
    }

    // base price from producer product
    const basePricePerKg = product.pricePerKg;

    // load commission settings
    let settings = await CommissionSetting.findOne();
    if (!settings) {
      settings = await CommissionSetting.create({
        retailCommissionPercent: 2,
        bulkCommissionPercent: 1,
      });
    }

    let commissionPercent = 0;
    let visibility = "consumer";

    if (sellType === "retail") {
      commissionPercent = settings.retailCommissionPercent;
      visibility = "consumer"; // consumer can see
    } else if (sellType === "bulk") {
      commissionPercent = settings.bulkCommissionPercent;
      visibility = "all"; // wholesaler + supersaler can see
    } else {
      return res.status(400).json({ message: "Invalid sellType" });
    }

    const newSellPost = new SellPost({
      product: product._id,
      producer: product.producer._id,
      seller: req.user._id,
      sellerRole: "supersaler",

      sellType,
      quantity: Number(quantity),
      unit,

      basePricePerKg: Number(basePricePerKg),
      sellingPricePerKg: Number(sellingPricePerKg),

      commissionPercent,
      district: req.user.district,
      thana: req.user.thana,
      visibility,
    });

    const saved = await newSellPost.save();

    res.status(201).json({
      message: `${sellType} post created successfully`,
      sellPost: saved,
    });
  } catch (error) {
    console.error("SellPost create error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};