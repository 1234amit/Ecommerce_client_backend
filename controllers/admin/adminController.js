import User from "../../models/User.js";
import Admin from "../../models/Admin.js";
import bcrypt from "bcryptjs";
import Product from "../../models/Product.js";
import Notification from "../../models/Notification.js";
import Order from "../../models/Order.js";
// import Product from "../models/Product.js";
import SellPost from "../../models/SellPost.js"; // ✅ ADD THIS
import BulkOrder from "../../models/BulkOrder.js";
import DeviceSession from "../../models/DeviceSession.js";
import {
  getUniqueActiveDeviceSessions,
  SUPERADMIN_MAX_DEVICES,
} from "../../services/deviceSessionService.js";
import { getAdminLogs } from "../../services/adminLogService.js";
import {
  DELIVERY_CHARGE,
  PROFIT_RATES,
  calculateProfitPrice,
} from "../../services/pricingService.js";
import {
  notifyOrderDecision,
  notifyProductDecision,
} from "../../services/notificationService.js";
import { verifyOtpToken } from "../../services/otpService.js";
import {
  deleteProductWithCascade,
  deleteUserWithCascade,
} from "../../services/productCascadeService.js";
export {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
} from "./categoryController.js";

const validOrderStatuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const validPaymentStatuses = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

const normalizeAdminOrderStatus = (status) => {
  if (!status) return undefined;
  if (status === "completed" || status === "approved") return "delivered";
  if (status === "rejected") return "cancelled";
  return status;
};

const toNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getImageUrlFromRequest = (req) => {
  if (typeof req.body?.image === "string" && req.body.image.trim()) {
    return req.body.image.trim();
  }

  return "";
};

const getAdminAccountByRequest = async (req, withPassword = false) => {
  const adminId = req.user?._id || req.user?.id;
  const authModel = req.user?.authModel || req.authModel;
  const select = withPassword ? "+password" : "-password";

  if (authModel === "Admin") {
    return Admin.findById(adminId).select(select);
  }

  const admin = await Admin.findById(adminId).select(select);
  if (admin) return admin;

  return User.findById(adminId).select(select);
};

const isPaidLikeStatus = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["paid", "approved", "confirmed", "delivered", "completed"].includes(normalized);
};

const isAdminCompletedOrderStatus = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["confirmed", "delivered", "completed"].includes(normalized);
};

const emitAdminProfitChanged = (req, payload = {}) => {
  const io = req.app?.get?.("io");
  if (!io) return;

  io.to("admin_room").emit("admin_profit_changed", {
    ...payload,
    changedAt: new Date(),
  });
};

const getProductProfitRate = (product = {}) => {
  if (product.adminProfitRate !== null && product.adminProfitRate !== undefined) {
    return product.adminProfitRate;
  }

  const ownerRole = String(product.producer?.role || product.producerRole || "").toLowerCase();
  const productType = String(product.productType || "").toLowerCase();

  if (ownerRole === "producer" && productType === "bulk") {
    return PROFIT_RATES.producerBulkToSupersaler;
  }

  return PROFIT_RATES.retailToConsumer;
};

const upsertSellPostForApprovedProduct = async (product) => {
  if (!product || product.addToSellPost !== "yes") return null;

  const owner = product.producer;
  const ownerRole = String(owner?.role || product.producerRole || "").toLowerCase();
  const productType = String(product.productType || "").toLowerCase();
  const isRetail = ["retail", "rental"].includes(productType);
  const isBulk = productType === "bulk";

  if (!["producer", "supersaler"].includes(ownerRole) || (!isBulk && !isRetail)) {
    return null;
  }

  const sellType = isBulk ? "bulk" : "retail";
  const price = toNumber(product.price || product.pricePerKg || product.sellingPricePerKg);
  const quantity = toNumber(product.quantity);
  const commissionPercent = getProductProfitRate(product);
  const commissionAmountPerKg = (price * commissionPercent) / 100;
  const district = owner?.district || product.district || "Unknown";
  const thana = owner?.thana || product.thana || "Unknown";

  return SellPost.findOneAndUpdate(
    {
      product: product._id,
      sellType,
    },
    {
      $set: {
        producer: owner?._id || owner,
        seller: owner?._id || owner,
        sellerRole: ownerRole,
        quantity,
        soldQuantity: 0,
        remainingQuantity: quantity,
        unit: product.unit || "kg",
        basePricePerKg: price,
        sellingPricePerKg: price,
        increasedAmountPerKg: 0,
        commissionPercent,
        commissionAmountPerKg,
        totalPrice: price * quantity,
        totalCommission: commissionAmountPerKg * quantity,
        district,
        thana,
        visibility: isBulk ? "all" : "consumer",
        isActive: true,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
};

export const updateProductProfitRate = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { productId } = req.params;
    const { profitRate } = req.body;
    const nextRate = Number(profitRate);

    if (!Number.isFinite(nextRate) || nextRate < 0 || nextRate > 100) {
      return res.status(400).json({ message: "Profit rate must be between 0 and 100" });
    }

    const product = await Product.findById(productId)
      .populate("producer", "name email phone role")
      .populate("category", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.adminProfitRate = nextRate;
    await product.save({ validateBeforeSave: false });

    return res.json({
      success: true,
      message: "Product profit rate updated successfully",
      product: withAdminProductPricing(product),
    });
  } catch (error) {
    console.error("updateProductProfitRate error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getSuperAdminDevices = async (req, res) => {
  try {
    if (req.user.authRole !== "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Superadmin access required" });
    }

    const userId = req.user._id || req.user.id;
    const sessions = await getUniqueActiveDeviceSessions(userId);

    return res.json({
      success: true,
      devices: sessions.map((session) => {
        const plain =
          typeof session.toObject === "function" ? session.toObject() : session;
        delete plain.userAgent;
        return plain;
      }),
      maxDevices: SUPERADMIN_MAX_DEVICES,
    });
  } catch (error) {
    console.error("getSuperAdminDevices error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAdminSystemLogs = async (req, res) => {
  try {
    if (req.user.authRole !== "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Superadmin access required" });
    }

    const { tab = "all", range = "week", limit = 100 } = req.query || {};
    const data = await getAdminLogs({ tab, range, limit });

    return res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("getAdminSystemLogs error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const revokeSuperAdminDevice = async (req, res) => {
  try {
    if (req.user.authRole !== "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Superadmin access required" });
    }

    const { sessionId } = req.params;
    const { password, otpToken } = req.body || {};

    const userId = req.user._id || req.user.id;
    const user = await getAdminAccountByRequest(req, true);

    if (!verifyOtpToken({ token: otpToken, phone: user?.phone, purpose: "password-reset" })) {
      return res.status(403).json({ message: "OTP verification is required" });
    }

    const passwordMatches = await bcrypt.compare(password || "", user?.password || "");

    if (!passwordMatches) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const session = await DeviceSession.findOne({
      user: userId,
      sessionId,
      revokedAt: null,
    });

    if (!session) {
      return res.status(404).json({ message: "Device not found" });
    }

    session.revokedAt = new Date();
    await session.save();

    return res.json({
      success: true,
      message: "Device removed successfully",
    });
  } catch (error) {
    console.error("revokeSuperAdminDevice error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const withAdminProductPricing = (product = {}) => {
  const plain = typeof product.toObject === "function" ? product.toObject() : { ...product };
  const profitRate = getProductProfitRate(plain);
  const pricing = calculateProfitPrice(plain.price || 0, profitRate);

  return {
    ...plain,
    basePrice: pricing.basePrice,
    adminProfit: pricing.adminProfit,
    profitRate: pricing.profitRate,
    finalPrice: pricing.finalPrice,
    deliveryFee: DELIVERY_CHARGE,
    finalTotalWithDelivery: pricing.finalPrice + DELIVERY_CHARGE,
    pricingBreakdown: {
      basePrice: pricing.basePrice,
      adminProfit: pricing.adminProfit,
      profitRate: pricing.profitRate,
      finalPrice: pricing.finalPrice,
      deliveryFee: DELIVERY_CHARGE,
      totalWithDelivery: pricing.finalPrice + DELIVERY_CHARGE,
    },
  };
};

const createOwnedProductForBuyer = async ({
  buyerId,
  sourceProductId,
  purchasedItem,
  approvalInfo = {},
}) => {
  if (!buyerId || !sourceProductId || !purchasedItem) return null;

  const buyer = buyerId ? await User.findById(buyerId).select("role") : null;
  if (!buyer || !["supersaler", "wholesaler"].includes(buyer.role)) {
    return null;
  }

  const sourceProduct = await Product.findById(sourceProductId);
  if (!sourceProduct) return null;

  const purchasedQty = toNumber(purchasedItem.quantity);
  if (purchasedQty <= 0) return null;

  const existingOwnedProduct = await Product.findOne({
    producer: buyerId,
    sourceProduct: sourceProductId,
  });

  if (existingOwnedProduct) {
    existingOwnedProduct.quantity = String(
      toNumber(existingOwnedProduct.quantity) + purchasedQty
    );
    existingOwnedProduct.price = String(
      toNumber(purchasedItem.price || existingOwnedProduct.price || sourceProduct.price || 0)
    );
    existingOwnedProduct.previousPrice = String(
      toNumber(
        purchasedItem.price ||
          existingOwnedProduct.previousPrice ||
          sourceProduct.previousPrice ||
          sourceProduct.price ||
          0
      )
    );
    existingOwnedProduct.status = "approved";
    existingOwnedProduct.addToSellPost = "no";
    existingOwnedProduct.isSelling = false;
    existingOwnedProduct.approvedBy =
      approvalInfo.approvedBy || existingOwnedProduct.approvedBy || null;
    existingOwnedProduct.approvedAt =
      existingOwnedProduct.approvedAt || approvalInfo.approvedAt || new Date();
    await existingOwnedProduct.save();
    return existingOwnedProduct;
  }

  return Product.create({
    producer: buyerId,
    sourceProduct: sourceProductId,
    image: sourceProduct.image,
    secondaryImages: sourceProduct.secondaryImages || [],
    productName: purchasedItem.productName || sourceProduct.productName,
    quantity: String(purchasedQty),
    price: String(toNumber(purchasedItem.price || sourceProduct.price || 0)),
    previousPrice: String(
      toNumber(
        purchasedItem.price ||
          sourceProduct.previousPrice ||
          sourceProduct.price ||
          0
      )
    ),
    description: sourceProduct.description,
    category: sourceProduct.category,
    priceType: sourceProduct.priceType,
    addToSellPost: "no",
    status: "approved",
    productType: sourceProduct.productType || "bulk",
    approvedBy: approvalInfo.approvedBy || null,
    approvedAt: approvalInfo.approvedAt || new Date(),
    isSelling: false,
  });
};

const normalizeApprovedOrderForResponse = (order = {}) => {
  const normalized = { ...order };

  if (
    isPaidLikeStatus(normalized.paymentStatus) ||
    isPaidLikeStatus(normalized.orderStatus) ||
    isPaidLikeStatus(normalized.adminActionStatus)
  ) {
    normalized.orderStatus = "delivered";
    normalized.statusDisplay = "Delivered";
    normalized.paymentStatus = "paid";
    normalized.paymentStatusDisplay = "Paid";
    normalized.adminActionStatus = normalized.adminActionStatus || "confirmed";
  }

  return normalized;
};

const syncApprovedOrdersAsPaidForResponse = async (orders = []) => {
  const idsToRepair = orders
    .filter((order) => {
      return (
        order.paymentStatus !== "paid" &&
        (isPaidLikeStatus(order.orderStatus) ||
          isPaidLikeStatus(order.adminActionStatus))
      );
    })
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
  }

  return orders.map(normalizeApprovedOrderForResponse);
};

const normalizeApprovedBulkOrderForResponse = (order = {}) => {
  const normalized = { ...order };
  const orderStatus = String(normalized.orderStatus || "").toLowerCase();

  if (["approved", "completed"].includes(orderStatus)) {
    normalized.paymentStatus = "paid";
    normalized.paymentStatusDisplay = "Paid";
    normalized.adminActionStatus = normalized.adminActionStatus || "confirmed";
  }

  return normalized;
};

const syncApprovedBulkOrdersAsPaidForResponse = async (orders = []) => {
  const idsToRepair = orders
    .filter((order) => {
      const orderStatus = String(order.orderStatus || "").toLowerCase();
      return ["approved", "completed"].includes(orderStatus) && order.paymentStatus !== "paid";
    })
    .map((order) => order._id)
    .filter(Boolean);

  if (idsToRepair.length) {
    await BulkOrder.updateMany(
      { _id: { $in: idsToRepair } },
      {
        $set: {
          paymentStatus: "paid",
          adminActionStatus: "confirmed",
        },
      }
    );
  }

  return orders.map(normalizeApprovedBulkOrderForResponse);
};

const assertOrderInventoryAvailable = async (order) => {
  if (!order || order.inventoryDeductedAt) {
    return;
  }

  for (const item of order?.items || []) {
    const productId = item.productId?._id || item.productId;
    if (!productId) continue;

    const product = await Product.findById(productId).select("productName quantity");
    if (!product) {
      throw new Error(`Product not found for order item: ${item.productName || productId}`);
    }

    const availableQuantity = toNumber(product.quantity);
    const requestedQuantity = toNumber(item.quantity);

    if (requestedQuantity <= 0) {
      throw new Error(`Invalid quantity for ${item.productName || product.productName}`);
    }

    if (availableQuantity < requestedQuantity) {
      throw new Error(
        `${product.productName} has only ${availableQuantity} available, requested ${requestedQuantity}`
      );
    }
  }
};

const deductProducerInventoryForPaidOrder = async (order) => {
  if (!order || order.inventoryDeductedAt) {
    return;
  }

  const isPaidOrder =
    isPaidLikeStatus(order.paymentStatus) ||
    isPaidLikeStatus(order.orderStatus) ||
    isPaidLikeStatus(order.adminActionStatus);

  if (!isPaidOrder) {
    return;
  }

  const buyerId = order.userId?._id || order.userId;
  const buyer = buyerId ? await User.findById(buyerId).select("role") : null;

  for (const item of order.items || []) {
    const productId = item.productId?._id || item.productId;
    if (!productId) continue;

    const product = await Product.findById(productId);
    if (!product) continue;

    const currentQuantity = toNumber(product.quantity);
    const purchasedQuantity = toNumber(item.quantity);

    if (purchasedQuantity <= 0) continue;
    if (currentQuantity < purchasedQuantity) {
      throw new Error(
        `${product.productName} has only ${currentQuantity} available, requested ${purchasedQuantity}`
      );
    }

    const nextQuantity = Math.max(0, currentQuantity - purchasedQuantity);

    product.quantity = String(nextQuantity);
    product.soldQuantity = toNumber(product.soldQuantity) + purchasedQuantity;
    product.soldAt = new Date();

    if (nextQuantity === 0) {
      product.addToSellPost = "no";
      product.isSelling = false;
    }

    await product.save();

    if (["supersaler", "wholesaler"].includes(buyer?.role) && purchasedQuantity > 0) {
      await createOwnedProductForBuyer({
        buyerId,
        sourceProductId: product._id,
        purchasedItem: {
          quantity: purchasedQuantity,
          price: item.price || product.price || 0,
          productName: item.productName || product.productName,
        },
        approvalInfo: {
          approvedBy: order.adminActionBy || null,
          approvedAt: order.adminActionAt || order.approvedAt || new Date(),
        },
      });
    }
  }

  order.inventoryDeductedAt = new Date();
  await order.save();
};

const transferInventoryForBulkOrderApproval = async (bulkOrder) => {
  if (!bulkOrder || !bulkOrder.product || !bulkOrder.wholesaler) {
    return;
  }

  if (bulkOrder.inventoryDeductedAt) {
    return;
  }

  if (bulkOrder.orderStatus !== "approved" || bulkOrder.paymentStatus !== "paid") {
    return;
  }

  const productId = bulkOrder.product?._id || bulkOrder.product;
  if (!productId) return;

  const product = await Product.findById(productId);
  if (!product) return;

  const purchasedQuantity = toNumber(bulkOrder.quantity);
  if (purchasedQuantity <= 0) return;

  const currentQuantity = toNumber(product.quantity);
  if (currentQuantity < purchasedQuantity) {
    throw new Error(
      `${product.productName} has only ${currentQuantity} available, requested ${purchasedQuantity}`
    );
  }

  const nextQuantity = Math.max(0, currentQuantity - purchasedQuantity);

  product.quantity = String(nextQuantity);
  product.soldQuantity = toNumber(product.soldQuantity) + purchasedQuantity;
  product.soldAt = new Date();

  if (nextQuantity === 0) {
    product.addToSellPost = "no";
    product.isSelling = false;
  }

  await product.save();

  const buyerId = bulkOrder.wholesaler?._id || bulkOrder.wholesaler;
  await createOwnedProductForBuyer({
    buyerId,
    sourceProductId: product._id,
    purchasedItem: {
      quantity: purchasedQuantity,
      price: bulkOrder.unitPrice || bulkOrder.totalAmount || 0,
      productName: product.productName,
    },
    approvalInfo: {
      approvedBy: bulkOrder.approvedBy || bulkOrder.adminActionBy || null,
      approvedAt: bulkOrder.approvedAt || bulkOrder.adminActionAt || new Date(),
    },
  });

  bulkOrder.inventoryDeductedAt = new Date();
  await bulkOrder.save();
};

// Get Admin Profile
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await getAdminAccountByRequest(req);

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

    const imageUrl = getImageUrlFromRequest(req);
    if (imageUrl) updateData.image = imageUrl;

    const AdminModel = req.user?.authModel === "Admin" ? Admin : User;
    const updatedAdmin = await AdminModel.findByIdAndUpdate(
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

// Update Admin Profile Image Only
export const updateAdminProfileImage = async (req, res) => {
  try {
    const adminId = req.user.id; // Extract user ID from token

    const imageUrl = getImageUrlFromRequest(req);
    if (!imageUrl) {
      return res.status(400).json({ message: "No image provided" });
    }

    const AdminModel = req.user?.authModel === "Admin" ? Admin : User;
    const updatedAdmin = await AdminModel.findByIdAndUpdate(
      adminId,
      { image: imageUrl },
      { new: true, runValidators: true, select: "-password" } // Exclude password field
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ 
      message: "Profile image updated successfully", 
      admin: updatedAdmin 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAdminProfitReport = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const normalOrders = await Order.find({
      isActive: true,
      $or: [
        { paymentStatus: "paid" },
        { orderStatus: { $in: ["confirmed", "delivered", "completed"] } },
        { adminActionStatus: "confirmed" },
      ],
    })
      .populate("userId", "name email phone role")
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const bulkOrders = await BulkOrder.find({
      $or: [
        { paymentStatus: "paid" },
        { orderStatus: { $in: ["approved", "completed"] } },
        { adminActionStatus: "confirmed" },
      ],
    })
      .populate("wholesaler", "name email phone role")
      .populate("producer", "name email phone role")
      .populate("product", "productName image")
      .sort({ createdAt: -1 })
      .lean();

    const normalRows = normalOrders.map((order) => {
      const adminProfit = Number(order.adminProfit || 0);
      const subtotal = Number(order.subtotal || 0);
      const deliveryFee = Number(order.deliveryFee || 0);

      return {
        _id: order._id,
        source: "order",
        orderId: order.orderId,
        buyer: order.userId,
        buyerRole: order.userId?.role || "consumer",
        baseSubtotal: Number(order.baseSubtotal || subtotal - adminProfit || 0),
        adminProfit,
        deliveryFee,
        subtotal,
        totalAmount: Number(order.totalAmount || subtotal + deliveryFee || 0),
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
      };
    });

    const bulkRows = bulkOrders.map((order) => {
      const subtotal = Number(order.subtotal || Number(order.unitPrice || 0) * Number(order.quantity || 0));
      const adminProfit = Number(order.adminProfit || 0);
      const deliveryFee = Number(order.deliveryFee || 0);

      return {
        _id: order._id,
        source: "bulkOrder",
        orderId: order.orderId,
        buyer: order.wholesaler,
        buyerRole: "wholesaler",
        seller: order.producer,
        product: order.product,
        baseSubtotal: Number(order.baseUnitPrice || 0) * Number(order.quantity || 0),
        adminProfit,
        deliveryFee,
        subtotal,
        totalAmount: Number(order.totalAmount || subtotal + deliveryFee || 0),
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
      };
    });

    const rows = [...normalRows, ...bulkRows].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    const summary = rows.reduce(
      (acc, row) => {
        acc.totalOrders += 1;
        acc.baseSubtotal += Number(row.baseSubtotal || 0);
        acc.adminProfit += Number(row.adminProfit || 0);
        acc.deliveryFee += Number(row.deliveryFee || 0);
        acc.totalAmount += Number(row.totalAmount || 0);
        return acc;
      },
      {
        totalOrders: 0,
        baseSubtotal: 0,
        adminProfit: 0,
        deliveryFee: 0,
        totalAmount: 0,
      }
    );

    return res.status(200).json({
      message: "Admin profit report fetched successfully",
      summary,
      profits: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Change Admin Password
export const changeAdminPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, otpToken } = req.body;

    // Find user
    const admin = await getAdminAccountByRequest(req, true);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (!verifyOtpToken({ token: otpToken, phone: admin.phone, purpose: "password-reset" })) {
      return res.status(403).json({ message: "OTP verification is required" });
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

export const getAdminUserDetails = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const ownProducts = await Product.find({ producer: userId })
      .populate("category", "name")
      .populate("producer", "name email phone role division district thana")
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();

    const consumerOrders = await Order.find({ userId })
      .populate("items.productId", "productName image price productType quantity")
      .sort({ createdAt: -1 })
      .limit(80)
      .lean({ virtuals: true });

    const bulkOrders = await BulkOrder.find({
      $or: [{ wholesaler: userId }, { producer: userId }],
    })
      .populate("product", "productName image price productType quantity")
      .populate("sellPost", "sellType")
      .populate("producer", "name email phone role")
      .populate("wholesaler", "name email phone role")
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();

    return res.json({
      message: "User details fetched successfully",
      user,
      ownProducts: ownProducts.map(withAdminProductPricing),
      purchasedProducts: [...consumerOrders, ...bulkOrders],
      consumerOrders,
      bulkOrders,
    });
  } catch (error) {
    console.error("getAdminUserDetails error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
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

    const deletion = await deleteUserWithCascade(userId);

    res.json({ message: "User deleted successfully", cleanup: deletion.cleanup });
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

    const deletion = await deleteUserWithCascade(userId);
    res.json({ message: "Consumer deleted successfully", cleanup: deletion.cleanup });
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

    const deletion = await deleteUserWithCascade(userId);
    res.json({ message: "SuperSaler deleted successfully", cleanup: deletion.cleanup });
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

    const deletion = await deleteUserWithCascade(userId);
    res.json({ message: "Wholesaler deleted successfully", cleanup: deletion.cleanup });
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

    const deletion = await deleteUserWithCascade(userId);
    res.json({ message: "Producer deleted successfully", cleanup: deletion.cleanup });
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

//view all the products by admin
// export const getAllProducts = async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const products = await Product.find()
//       .populate('producer', 'name email phone') // Populate producer details
//       .sort({ createdAt: -1 }); // Sort by newest first

//     if (products.length === 0) {
//       return res.status(404).json({ message: "No products found" });
//     }

//     res.json({
//       message: "All products fetched successfully",
//       products,
//     });
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // Get single product by ID (Admin Only)
// export const getProductById = async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const productId = req.params.id;
//     const product = await Product.findById(productId)
//       .populate('producer', 'name email phone'); // Populate producer details

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     res.json({
//       message: "Product details fetched successfully",
//       product,
//     });
//   } catch (error) {
//     console.error("Error fetching product:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // Delete product by ID (Admin Only)
export const deleteProductById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const productId = req.params.id;
    
    // Find the product and populate producer details
    const product = await Product.findById(productId).populate('producer');
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Create notification for deletion started
    const deletionStartedNotification = new Notification({
      recipient: product.producer._id,
      type: "product_deletion_started",
      message: `Admin has initiated deletion of your product: ${product.productName}`,
      productId: product._id
    });
    await deletionStartedNotification.save();

    // Emit real-time notification for deletion started
    req.app.get('io').to(product.producer._id.toString()).emit('notification', {
      type: 'product_deletion_started',
      message: `Admin has initiated deletion of your product: ${product.productName}`,
      notification: deletionStartedNotification
    });

    const deletion = await deleteProductWithCascade(product);

    // Create notification for deletion completed
    const deletionCompletedNotification = new Notification({
      recipient: product.producer._id,
      type: "product_deletion_completed",
      message: `Your product "${product.productName}" has been deleted by admin`,
      productId: product._id
    });
    await deletionCompletedNotification.save();

    // Emit real-time notification for deletion completed
    req.app.get('io').to(product.producer._id.toString()).emit('notification', {
      type: 'product_deletion_completed',
      message: `Your product "${product.productName}" has been deleted by admin`,
      notification: deletionCompletedNotification
    });

    res.json({ 
      message: "Product deleted successfully",
      cleanup: deletion?.cleanup || {},
      notifications: {
        started: deletionStartedNotification,
        completed: deletionCompletedNotification
      }
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get All Pending Products (Admin)
export const getPendingProducts = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const products = await Product.find({ status: "pending" })
      .populate("producer", "name email phone role")
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({
      message: "Pending products fetched successfully",
      products: products.map(withAdminProductPricing),
    });
  } catch (error) {
    console.error("Error fetching pending products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get All Approved Products (Admin)
export const getApprovedProducts = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const products = await Product.find({ status: "approved" })
      .populate("producer", "name email phone role")
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({
      message: "Approved products fetched successfully",
      products: products.map(withAdminProductPricing),
    });
  } catch (error) {
    console.error("Error fetching approved products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get All Rejected Products (Admin)
export const getRejectedProducts = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const products = await Product.find({ status: "rejected" })
      .populate("producer", "name email phone role")
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({
      message: "Rejected products fetched successfully",
      products: products.map(withAdminProductPricing),
    });
  } catch (error) {
    console.error("Error fetching rejected products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Approve Product (Admin)
// export const approveProduct = async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const { productId } = req.params;

//     const product = await Product.findById(productId).populate("producer");

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     if (product.status === "approved") {
//       return res.status(400).json({ message: "Product already approved" });
//     }

//     product.status = "approved";
//     product.approvedBy = req.user._id;
//     product.approvedAt = new Date();
//     product.updatedAt = new Date();

//     await product.save();

//     // ✅ Notification for Producer
//     await Notification.create({
//       recipient: product.producer._id,
//       message: `Your product "${product.productName}" has been approved by admin.`,
//       isRead: false,
//       createdAt: new Date(),
//     });

//     res.json({
//       message: "Product approved successfully",
//       product,
//     });
//   } catch (error) {
//     console.error("Error approving product:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// export const approveProduct = async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const { productId } = req.params;

//     const product = await Product.findById(productId).populate("producer");

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     if (product.status === "approved") {
//       return res.status(400).json({ message: "Product already approved" });
//     }

//     product.status = "approved";
//     product.approvedBy = req.user._id;
//     product.approvedAt = new Date();
//     product.updatedAt = new Date();

//     await product.save();

//     // ✅ Notification for Producer (FIXED)
//     await Notification.create({
//       recipient: product.producer._id,
//       sender: req.user._id,
//       type: "product_approved",
//       category: "product",
//       title: "Product Approved",
//       message: `Your product "${product.productName}" has been approved by admin.`,
//       productId: product._id,
//       priority: "normal",
//       isRead: false,
//     });

//     res.json({
//       message: "Product approved successfully",
//       product,
//     });
//   } catch (error) {
//     console.error("Error approving product:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

export const approveProduct = async (req, res) => {
  try {
    // ✅ Check admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { productId } = req.params;

    // ✅ Find product
    const product = await Product.findById(productId).populate("producer");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // ✅ Already approved check
    if (product.status === "approved") {
      return res.status(400).json({
        message: "Product already approved",
      });
    }

    // ✅ FIX missing productType problem
    // old products may not contain productType
    if (!product.productType) {
      product.productType = "general";
    }

    // ✅ Update product
    product.status = "approved";
    product.approvedBy = req.user._id;
    product.approvedAt = new Date();
    product.updatedAt = new Date();

    // ✅ Save product
    await product.save({ validateBeforeSave: false });
    await upsertSellPostForApprovedProduct(product);

    await notifyProductDecision({
      product,
      adminId: req.user._id,
      approved: true,
    });

    // ✅ Response
    res.status(200).json({
      success: true,
      message: "Product approved successfully",
      product,
    });

  } catch (error) {
    console.error("Approve Product Error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// ✅ Reject Product (Admin)
export const rejectProduct = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { productId } = req.params;

    const product = await Product.findById(productId).populate("producer");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.status === "rejected") {
      return res.status(400).json({ message: "Product already rejected" });
    }

    product.status = "rejected";
    product.approvedBy = null;
    product.approvedAt = null;
    product.isSelling = false;
    product.updatedAt = new Date();

    await product.save();

    // ✅ Notification for Producer
    // await Notification.create({
    //   recipient: product.producer._id,
    //   message: `Your product "${product.productName}" has been rejected by admin.`,
    //   isRead: false,
    //   createdAt: new Date(),
    // });

    await notifyProductDecision({
      product,
      adminId: req.user._id,
      approved: false,
      reason: req.body?.reason,
    });

    res.json({
      message: "Product rejected successfully",
      product,
    });
  } catch (error) {
    console.error("Error rejecting product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Single Product Details by Admin
export const getProductDetailsByAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { productId } = req.params;

    const product = await Product.findById(productId)
      .populate("producer", "name email phone role")
      .populate("category", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product details fetched successfully",
      product: withAdminProductPricing(product),
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get All Products (Admin) - Optional
export const getAllProductsAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const products = await Product.find()
      .populate("producer", "name email phone role")
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({
      message: "All products fetched successfully",
      products: products.map(withAdminProductPricing),
    });
  } catch (error) {
    console.error("Error fetching all products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//get all sell posts by admin

export const getAllSellPostsForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const posts = await SellPost.find()
      .populate("product", "productName")
      .populate("seller", "name phone role")
      .populate("producer", "name phone")
      .sort({ createdAt: -1 });

    const stalePostIds = posts.filter((post) => !post.product).map((post) => post._id);
    if (stalePostIds.length) {
      await SellPost.deleteMany({ _id: { $in: stalePostIds } });
    }

    res.json({
      message: "All sell posts fetched",
      posts: posts.filter((post) => post.product),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// admin see supersaler order post


export const getAllSupersalerOrdersForAdmin = async (req, res) => {
  try {

    // ==========================
    // ADMIN CHECK
    // ==========================
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    // ==========================
    // GET SUPERSALER IDS
    // ==========================
    const supersalers = await User.find({
      role: "supersaler",
    }).select("_id");

    // IMPORTANT FIX
    const supersalerIds = supersalers.map(
      (user) => user._id.toString()
    );

    // ==========================
    // GET ORDERS
    // ==========================
    const supersalerOrders = await Order.find({
      userId: { $in: supersalerIds },
      isActive: true,
    })
      .populate({
        path: "userId",
        select: "name email phone role district thana",
      })
      .populate({
        path: "items.productId",
        populate: [
          {
            path: "category",
            select: "name",
          },
          {
            path: "producer",
            select: "name email phone",
          },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();
    const normalizedOrders = await syncApprovedOrdersAsPaidForResponse(supersalerOrders);

    // ==========================
    // RESPONSE
    // ==========================
    return res.status(200).json({
      message: "Supersaler orders fetched successfully",
      totalOrders: normalizedOrders.length,
      orders: normalizedOrders,
    });

  } catch (error) {

    console.error(
      "getAllSupersalerOrdersForAdmin error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateSupersalerOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { orderId } = req.params;
    const orderStatus = normalizeAdminOrderStatus(req.body.orderStatus);
    const { paymentStatus } = req.body;
    const updateData = {};

    if (orderStatus && validOrderStatuses.includes(orderStatus)) {
      updateData.orderStatus = orderStatus;
    }

    if (paymentStatus && validPaymentStatuses.includes(paymentStatus)) {
      updateData.paymentStatus = paymentStatus;
    }

    if (paymentStatus === "paid" && !updateData.orderStatus) {
      updateData.orderStatus = "delivered";
    }

    if (isAdminCompletedOrderStatus(orderStatus) && !updateData.paymentStatus) {
      updateData.paymentStatus = "paid";
    }

    if (paymentStatus === "paid" || isAdminCompletedOrderStatus(orderStatus)) {
      updateData.adminActionStatus = "confirmed";
      updateData.adminActionBy = req.user.id;
      updateData.adminActionAt = new Date();
    }

    if (updateData.orderStatus === "cancelled") {
      updateData.adminActionStatus = "rejected";
      updateData.adminActionBy = req.user.id;
      updateData.adminActionAt = new Date();
      updateData.cancelledBy = "admin";
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = req.body.reason || req.body.cancellationReason || "Rejected by admin";
    }

    if (updateData.paymentStatus === "paid" || isAdminCompletedOrderStatus(updateData.orderStatus)) {
      const orderBeforeUpdate = await Order.findById(orderId);
      if (!orderBeforeUpdate) {
        return res.status(404).json({ message: "Order not found" });
      }
      await assertOrderInventoryAvailable(orderBeforeUpdate);
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    ).populate("items.productId");

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (updatedOrder.paymentStatus === "paid") {
      await deductProducerInventoryForPaidOrder(updatedOrder);
    }

    const syncedOrder = await Order.findById(orderId)
      .populate("userId", "name email phone role district thana")
      .populate("items.productId");

    if (syncedOrder?.paymentStatus === "paid" || isAdminCompletedOrderStatus(syncedOrder?.orderStatus)) {
      await notifyOrderDecision({
        order: syncedOrder,
        adminId: req.user._id,
        approved: true,
      });
      emitAdminProfitChanged(req, {
        source: "supersaler_order",
        orderId: syncedOrder?.orderId,
        adminProfit: syncedOrder?.adminProfit,
      });
    } else if (syncedOrder?.orderStatus === "cancelled" || syncedOrder?.adminActionStatus === "rejected") {
      await notifyOrderDecision({
        order: syncedOrder,
        adminId: req.user._id,
        approved: false,
        reason: syncedOrder?.cancellationReason,
      });
    }

    return res.status(200).json({
      message: "Order status updated successfully",
      order: syncedOrder,
    });
  } catch (error) {
    if (String(error.message || "").includes("requested")) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// admin see wholesaler orders

export const getAllWholesalerOrdersForAdmin = async (req, res) => {
  try {
    // ==========================
    // ADMIN CHECK
    // ==========================
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    // ==========================
    // GET WHOLESALER IDS
    // ==========================
    const wholesalers = await User.find({
      role: "wholesaler",
    }).select("_id");

    const wholesalerIds = wholesalers.map(
      (user) => user._id.toString()
    );

    // ==========================
    // GET ORDERS
    // ==========================
    const wholesalerOrders = await Order.find({
      userId: { $in: wholesalerIds },
      isActive: true,
    })
      .populate({
        path: "userId",
        select: "name email phone role district thana",
      })
      .populate({
        path: "items.productId",
        populate: [
          {
            path: "category",
            select: "name",
          },
          {
            path: "producer",
            select: "name email phone",
          },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();
    const normalizedOrders = await syncApprovedOrdersAsPaidForResponse(wholesalerOrders);

    return res.status(200).json({
      message: "Wholesaler orders fetched successfully",
      totalOrders: normalizedOrders.length,
      orders: normalizedOrders,
    });

  } catch (error) {
    console.error(
      "getAllWholesalerOrdersForAdmin error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


export const updateWholesalerOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { orderId } = req.params;
    const orderStatus = normalizeAdminOrderStatus(req.body.orderStatus);
    const { paymentStatus } = req.body;

    const updateData = {};

    if (
      orderStatus &&
      validOrderStatuses.includes(orderStatus)
    ) {
      updateData.orderStatus = orderStatus;
    }

    if (
      paymentStatus &&
      validPaymentStatuses.includes(paymentStatus)
    ) {
      updateData.paymentStatus = paymentStatus;
    }

    if (paymentStatus === "paid" && !updateData.orderStatus) {
      updateData.orderStatus = "delivered";
    }

    if (isAdminCompletedOrderStatus(orderStatus) && !updateData.paymentStatus) {
      updateData.paymentStatus = "paid";
    }

    if (updateData.paymentStatus === "paid" || isAdminCompletedOrderStatus(updateData.orderStatus)) {
      updateData.adminActionStatus = "confirmed";
      updateData.adminActionBy = req.user.id;
      updateData.adminActionAt = new Date();

      const orderBeforeUpdate = await Order.findById(orderId);
      if (!orderBeforeUpdate) {
        return res.status(404).json({
          message: "Order not found",
        });
      }
      await assertOrderInventoryAvailable(orderBeforeUpdate);
    }

    if (updateData.orderStatus === "cancelled") {
      updateData.adminActionStatus = "rejected";
      updateData.adminActionBy = req.user.id;
      updateData.adminActionAt = new Date();
      updateData.cancelledBy = "admin";
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = req.body.reason || req.body.cancellationReason || "Rejected by admin";
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    )
      .populate("userId", "name email phone")
      .populate("items.productId");

    if (!updatedOrder) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (updatedOrder.paymentStatus === "paid") {
      await deductProducerInventoryForPaidOrder(updatedOrder);
    }

    const syncedOrder = await Order.findById(orderId)
      .populate("userId", "name email phone")
      .populate("items.productId");

    if (syncedOrder?.paymentStatus === "paid" || isAdminCompletedOrderStatus(syncedOrder?.orderStatus)) {
      await notifyOrderDecision({
        order: syncedOrder,
        adminId: req.user._id,
        approved: true,
      });
      emitAdminProfitChanged(req, {
        source: "wholesaler_order",
        orderId: syncedOrder?.orderId,
        adminProfit: syncedOrder?.adminProfit,
      });
    } else if (syncedOrder?.orderStatus === "cancelled" || syncedOrder?.adminActionStatus === "rejected") {
      await notifyOrderDecision({
        order: syncedOrder,
        adminId: req.user._id,
        approved: false,
        reason: syncedOrder?.cancellationReason,
      });
    }

    return res.status(200).json({
      message: "Wholesaler order updated successfully",
      order: syncedOrder,
    });

  } catch (error) {
    console.error(
      "updateWholesalerOrderStatus error:",
      error
    );

    if (String(error.message || "").includes("requested")) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


//admin see consumer orders

export const getAllConsumerOrdersForAdmin = async (req, res) => {
  try {
    // ==========================
    // ADMIN CHECK
    // ==========================
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    // ==========================
    // GET CONSUMER IDS
    // ==========================
    const consumers = await User.find({
      role: "consumer",
    }).select("_id");

    const consumerIds = consumers.map(
      (user) => user._id.toString()
    );

    // ==========================
    // GET ORDERS
    // ==========================
    const consumerOrders = await Order.find({
      userId: { $in: consumerIds },
      isActive: true,
    })
      .populate({
        path: "userId",
        select: "name email phone role district thana",
      })
      .populate({
        path: "items.productId",
        populate: [
          {
            path: "category",
            select: "name",
          },
          {
            path: "producer",
            select: "name email phone",
          },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();
    const normalizedOrders = await syncApprovedOrdersAsPaidForResponse(consumerOrders);

    return res.status(200).json({
      message: "Consumer orders fetched successfully",
      totalOrders: normalizedOrders.length,
      orders: normalizedOrders,
    });

  } catch (error) {
    console.error(
      "getAllConsumerOrdersForAdmin error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



export const updateConsumerOrderStatus = async (req, res) => {
  try {
    // ==========================
    // ADMIN CHECK
    // ==========================
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { orderId } = req.params;
    const orderStatus = normalizeAdminOrderStatus(req.body.orderStatus);
    const { paymentStatus } = req.body;

    const updateData = {};

    if (
      orderStatus &&
      validOrderStatuses.includes(orderStatus)
    ) {
      updateData.orderStatus = orderStatus;
    }

    if (
      paymentStatus &&
      validPaymentStatuses.includes(paymentStatus)
    ) {
      updateData.paymentStatus = paymentStatus;
    }

    if (paymentStatus === "paid" && !updateData.orderStatus) {
      updateData.orderStatus = "delivered";
    }

    if (isAdminCompletedOrderStatus(orderStatus) && !updateData.paymentStatus) {
      updateData.paymentStatus = "paid";
    }

    if (updateData.paymentStatus === "paid" || isAdminCompletedOrderStatus(updateData.orderStatus)) {
      updateData.adminActionStatus = "confirmed";
      updateData.adminActionBy = req.user.id;
      updateData.adminActionAt = new Date();

      const orderBeforeUpdate = await Order.findById(orderId);
      if (!orderBeforeUpdate) {
        return res.status(404).json({
          message: "Order not found",
        });
      }
      await assertOrderInventoryAvailable(orderBeforeUpdate);
    }

    if (updateData.orderStatus === "cancelled") {
      updateData.adminActionStatus = "rejected";
      updateData.adminActionBy = req.user.id;
      updateData.adminActionAt = new Date();
      updateData.cancelledBy = "admin";
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = req.body.reason || req.body.cancellationReason || "Rejected by admin";
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    )
      .populate("userId", "name email phone role")
      .populate("items.productId");

    if (!updatedOrder) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (updatedOrder.paymentStatus === "paid") {
      await deductProducerInventoryForPaidOrder(updatedOrder);
    }

    const syncedOrder = await Order.findById(orderId)
      .populate("userId", "name email phone role")
      .populate("items.productId");

    if (syncedOrder?.paymentStatus === "paid" || isAdminCompletedOrderStatus(syncedOrder?.orderStatus)) {
      await notifyOrderDecision({
        order: syncedOrder,
        adminId: req.user._id,
        approved: true,
      });
      emitAdminProfitChanged(req, {
        source: "consumer_order",
        orderId: syncedOrder?.orderId,
        adminProfit: syncedOrder?.adminProfit,
      });
    } else if (syncedOrder?.orderStatus === "cancelled" || syncedOrder?.adminActionStatus === "rejected") {
      await notifyOrderDecision({
        order: syncedOrder,
        adminId: req.user._id,
        approved: false,
        reason: syncedOrder?.cancellationReason,
      });
    }

    return res.status(200).json({
      message: "Consumer order updated successfully",
      order: syncedOrder,
    });

  } catch (error) {
    console.error(
      "updateConsumerOrderStatus error:",
      error
    );

    if (String(error.message || "").includes("requested")) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// ✅ Admin: Get all supersaler purchased products
export const getSupersalerPurchasedProductsForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const supersalers = await User.find({ role: "supersaler" }).select("_id");

    const supersalerIds = supersalers.map((user) => user._id);

    const purchases = await Order.find({
      userId: { $in: supersalerIds },
      orderStatus: "delivered",
      paymentStatus: "paid",
    })
      .populate({
        path: "userId",
        select: "name phone role district thana address",
      })
      .populate("items.productId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Supersaler purchased products fetched successfully",
      total: purchases.length,
      purchases,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// ✅ Admin: Get all wholesaler purchased products
export const getWholesalerPurchasedProductsForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const wholesalers = await User.find({ role: "wholesaler" }).select("_id");

    const wholesalerIds = wholesalers.map((user) => user._id);

    const purchases = await Order.find({
      userId: { $in: wholesalerIds },
      orderStatus: "delivered",
      paymentStatus: "paid",
    })
      .populate({
        path: "userId",
        select: "name phone role district thana address",
      })
      .populate("items.productId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Wholesaler purchased products fetched successfully",
      total: purchases.length,
      purchases,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// ✅ Admin: Get all producer purchased products
export const getProducerPurchasedProductsForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const producers = await User.find({ role: "producer" }).select("_id");

    const producerIds = producers.map((user) => user._id);

    const purchases = await Order.find({
      userId: { $in: producerIds },
      orderStatus: "delivered",
      paymentStatus: "paid",
    })
      .populate({
        path: "userId",
        select: "name phone role district thana address",
      })
      .populate("items.productId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Producer purchased products fetched successfully",
      total: purchases.length,
      purchases,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


export const getPendingSupersalerProductsForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const pendingProducts = await Product.find({
      status: "pending",
    })
      .populate({
        path: "producer",
        select: "name phone role district thana address",
        match: { role: "supersaler" },
      })
      .sort({ createdAt: -1 });

    const filteredProducts = pendingProducts.filter(
      (product) => product.producer !== null
    );

    return res.status(200).json({
      message: "Pending supersaler products fetched successfully",
      total: filteredProducts.length,
      products: filteredProducts,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



// export const approveSupersalerProductByAdmin = async (req, res) => {
//   try {
//     // ==========================
//     // Admin check
//     // ==========================
//     if (req.user.role !== "admin") {
//       return res.status(403).json({
//         message: "Unauthorized access",
//       });
//     }

//     const { productId } = req.params;

//     // ==========================
//     // Get product
//     // ==========================
//     const product = await Product.findById(productId).populate({
//       path: "producer",
//       select: "name phone role district thana",
//     });

//     if (!product) {
//       return res.status(404).json({
//         message: "Product not found",
//       });
//     }

//     if (product.producer?.role !== "supersaler") {
//       return res.status(400).json({
//         message: "This product is not a supersaler product",
//       });
//     }

//     // ==========================
//     // APPROVE PRODUCT
//     // ==========================
//     product.status = "approved";
//     product.approvedBy = req.user._id;
//     product.approvedAt = new Date();

//     await product.save();

//     // ==========================
//     // BULK → SELLPOST (WHOLESALER)
//     // ==========================
//     if (
//       product.productType === "bulk" &&
//       product.addToSellPost === "yes"
//     ) {
//       const district =
//         product.producer?.district ||
//         product.district ||
//         "Unknown";

//       const thana =
//         product.producer?.thana ||
//         product.thana ||
//         "Unknown";

//       await SellPost.create({
//         product: product._id,
//         producer: product.producer?._id,
//         seller: product.producer?._id,
//         sellerRole: "supersaler",

//         sellType: "bulk",

//         quantity: Number(product.quantity || 0),
//         remainingQuantity: Number(product.quantity || 0),

//         unit: "kg",

//         basePricePerKg: 0,
//         sellingPricePerKg: Number(product.price || 0),

//         increasedAmountPerKg: 0,

//         commissionPercent: 1,
//         commissionAmountPerKg:
//           (Number(product.price || 0) * 1) / 100,

//         district,
//         thana,

//         visibility: "all",
//         isActive: true,
//       });
//     }

//     // ==========================
//     // RENTAL → CONSUMER ONLY
//     // ==========================
//     if (product.productType === "rental") {
//       product.isSelling = true; // or your consumer visibility flag
//       await product.save();
//     }

//     // ==========================
//     // RESPONSE
//     // ==========================
//     return res.status(200).json({
//       message: "Supersaler product approved successfully",
//       product,
//     });

//   } catch (error) {
//     console.error("approveSupersalerProductByAdmin error:", error);

//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };


export const approveSupersalerProductByAdmin = async (req, res) => {
  try {
    // ==========================
    // Admin Check
    // ==========================
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { productId } = req.params;

    // ==========================
    // Find Product
    // ==========================
    const product = await Product.findById(productId).populate({
      path: "producer",
      select: "name phone role district thana",
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.producer?.role !== "supersaler") {
      return res.status(400).json({
        message: "This product is not a supersaler product",
      });
    }

    // ==========================
    // Approve Product
    // ==========================
    product.status = "approved";
    product.approvedBy = req.user._id;
    product.approvedAt = new Date();

    await product.save();
    await upsertSellPostForApprovedProduct(product);
    await notifyProductDecision({
      product,
      adminId: req.user._id,
      approved: true,
    });

    return res.status(200).json({
      message: "Supersaler product approved successfully",
      product,
    });
  } catch (error) {
    console.error(
      "approveSupersalerProductByAdmin error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

//approved all product by admin
// export const approveAllProductByAdmin = async (req, res) => {
//   try {
//     // ==========================
//     // Admin Check
//     // ==========================
//     if (req.user.role !== "admin") {
//       return res.status(403).json({
//         message: "Unauthorized access",
//       });
//     }

//     const { productId } = req.params;

//     // ==========================
//     // Find Product
//     // ==========================
//     const product = await Product.findById(productId).populate({
//       path: "producer",
//       select: "name phone role district thana",
//     });

//     if (!product) {
//       return res.status(404).json({
//         message: "Product not found",
//       });
//     }

//     if (product.producer?.role !== "supersaler") {
//       return res.status(400).json({
//         message: "This product is not a supersaler product",
//       });
//     }

//     // ==========================
//     // Approve Product
//     // ==========================
//     product.status = "approved";
//     product.approvedBy = req.user._id;
//     product.approvedAt = new Date();

//     await product.save();

//     const district =
//       product.producer?.district ||
//       product.district ||
//       "Unknown";

//     const thana =
//       product.producer?.thana ||
//       product.thana ||
//       "Unknown";

//     // =====================================================
//     // BULK PRODUCT -> WHOLESALER SELL POST
//     // =====================================================
//     if (
//       product.productType === "bulk" &&
//       product.addToSellPost === "yes"
//     ) {
//       await SellPost.create({
//         product: product._id,

//         producer: product.producer?._id,
//         seller: product.producer?._id,

//         sellerRole: "supersaler",

//         sellType: "bulk",

//         quantity: Number(product.quantity || 0),
//         soldQuantity: 0,
//         remainingQuantity: Number(product.quantity || 0),

//         unit: "kg",

//         basePricePerKg: Number(product.price || 0),

//         sellingPricePerKg: Number(product.price || 0),

//         increasedAmountPerKg: 0,

//         commissionPercent: 1,

//         commissionAmountPerKg:
//           (Number(product.price || 0) * 1) / 100,

//         totalPrice:
//           Number(product.price || 0) *
//           Number(product.quantity || 0),

//         totalCommission:
//           ((Number(product.price || 0) * 1) / 100) *
//           Number(product.quantity || 0),

//         district,
//         thana,

//         visibility: "all",

//         isActive: true,
//       });
//     }

//     // =====================================================
//     // RENTAL PRODUCT -> CONSUMER SELL POST
//     // =====================================================
//     if (
//       product.productType === "rental" &&
//       product.addToSellPost === "yes"
//     ) {
//       await SellPost.create({
//         product: product._id,

//         producer: product.producer?._id,
//         seller: product.producer?._id,

//         sellerRole: "supersaler",

//         sellType: "retail",

//         quantity: Number(product.quantity || 0),
//         soldQuantity: 0,
//         remainingQuantity: Number(product.quantity || 0),

//         unit: "kg",

//         basePricePerKg: Number(product.price || 0),

//         sellingPricePerKg: Number(product.price || 0),

//         increasedAmountPerKg: 0,

//         commissionPercent: 2,

//         commissionAmountPerKg:
//           (Number(product.price || 0) * 2) / 100,

//         totalPrice:
//           Number(product.price || 0) *
//           Number(product.quantity || 0),

//         totalCommission:
//           ((Number(product.price || 0) * 2) / 100) *
//           Number(product.quantity || 0),

//         district,
//         thana,

//         visibility: "consumer",

//         isActive: true,
//       });
//     }

//     return res.status(200).json({
//       message: "product approved successfully",
//       product,
//     });
//   } catch (error) {
//     console.error(
//       "approveAllProductByAdmin error:",
//       error
//     );

//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

export const approveAllProductByAdmin = async (req, res) => {
  try {
    // ==========================
    // Admin Check
    // ==========================
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { productId } = req.params;

    // ==========================
    // Find Product
    // ==========================
    const product = await Product.findById(productId).populate({
      path: "producer",
      select: "name phone role district thana",
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // ==========================
    // Approve Product
    // ==========================
    product.status = "approved";
    product.approvedBy = req.user._id;
    product.approvedAt = new Date();

    await product.save();
    await upsertSellPostForApprovedProduct(product);
    await notifyProductDecision({
      product,
      adminId: req.user._id,
      approved: true,
    });

    return res.status(200).json({
      message: "product approved successfully",
      product: withAdminProductPricing(product),
    });
  } catch (error) {
    console.error(
      "approveAllProductByAdmin error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const rejectSupersalerProductByAdmin = async (req, res) => {
  try {
    // ✅ Admin check
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { productId } = req.params;
    const { reason } = req.body;

    // ✅ Check product exists + populate producer
    const product = await Product.findById(productId).populate({
      path: "producer",
      select: "name phone role",
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ✅ Check supersaler product
    if (product.producer?.role !== "supersaler") {
      return res.status(400).json({
        message: "This product is not a supersaler product",
      });
    }

    // ✅ Update without validation issues
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          status: "rejected",
          rejectedBy: req.user._id,
          rejectedAt: new Date(),
          rejectionReason: reason || "Rejected by admin",
        },
      },
      { new: true }
    ).populate({
      path: "producer",
      select: "name phone role",
    });

    await notifyProductDecision({
      product: updatedProduct,
      adminId: req.user._id,
      approved: false,
      reason,
    });

    return res.status(200).json({
      message: "Supersaler product rejected successfully",
      product: updatedProduct,
    });

  } catch (error) {
    console.error("Reject Supersaler Product Error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

//reject all product by admin
// export const rejectAllProductByAdmin = async (req, res) => {
//   try {
//     // ✅ Admin check
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const { productId } = req.params;
//     const { reason } = req.body;

//     // ✅ Check product exists + populate producer
//     const product = await Product.findById(productId).populate({
//       path: "producer",
//       select: "name phone role",
//     });

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     // ✅ Reject product (producer OR supersaler)
//     const updatedProduct = await Product.findByIdAndUpdate(
//       productId,
//       {
//         $set: {
//           status: "rejected",
//           rejectedBy: req.user._id,
//           rejectedAt: new Date(),
//           rejectionReason: reason || "Rejected by admin",
//         },
//       },
//       { new: true }
//     ).populate({
//       path: "producer",
//       select: "name phone role",
//     });

//     return res.status(200).json({
//       message: "product rejected successfully",
//       product: updatedProduct,
//     });

//   } catch (error) {
//     console.error("Reject Product Error:", error);

//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

export const rejectAllProductByAdmin = async (req, res) => {
  try {
    // ✅ Admin check
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { productId } = req.params;
    const { reason } = req.body;

    // ✅ Check product exists + populate producer
    const product = await Product.findById(productId).populate({
      path: "producer",
      select: "name phone role",
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // ✅ Reject product (producer OR supersaler)
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          status: "rejected",
          rejectedBy: req.user._id,
          rejectedAt: new Date(),
          rejectionReason: reason || "Rejected by admin",
        },
      },
      { new: true }
    ).populate({
      path: "producer",
      select: "name phone role",
    });

    await notifyProductDecision({
      product: updatedProduct,
      adminId: req.user._id,
      approved: false,
      reason,
    });

    return res.status(200).json({
      message: "product rejected successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Reject Product Error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getApprovedSupersalerProducts = async (req, res) => {
  try {
    const products = await Product.find({
      status: "approved",
    })
      .populate({
        path: "producer",
        select: "name phone role district thana address",
        match: { role: "supersaler" },
      })
      .sort({ createdAt: -1 });

    const approvedSupersalerProducts = products.filter(
      (product) => product.producer !== null
    );

    return res.status(200).json({
      message: "Approved supersaler products fetched successfully",
      total: approvedSupersalerProducts.length,
      products: approvedSupersalerProducts,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// admin view supersaller order

export const getSupersalerOrders = async (req, res) => {

}



export const adminGetWholesalerOrders = async (req, res) => {
  try {
    // 1. Admin check
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { status, paymentStatus } = req.query;

    // 2. Build filter dynamically
    const filter = {};

    if (status) {
      filter.orderStatus = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // 3. Fetch orders
    const orders = await BulkOrder.find(filter)
      .populate("wholesaler", "name phone email district thana")
      .populate("producer", "name phone email")
      .populate("product", "productName image price")
      .populate("sellPost", "pricePerUnit remainingQuantity")
      .sort({ createdAt: -1 })
      .lean();
    const normalizedOrders = await syncApprovedBulkOrdersAsPaidForResponse(orders);

    return res.status(200).json({
      message: "All wholesaler orders fetched successfully",
      total: normalizedOrders.length,
      orders: normalizedOrders,
    });
  } catch (error) {
    console.error("ADMIN ORDER ERROR:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



// import BulkOrder from "../../models/BulkOrder.js";
// wholesaler approved order
export const adminApproveOrder = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { orderId } = req.params;

    const order = await BulkOrder.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.orderStatus === "approved") {
      if (order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";
      }
      order.adminActionStatus = "confirmed";
      order.adminActionBy = order.adminActionBy || req.user.id;
      order.adminActionAt = order.adminActionAt || new Date();
      order.approvedBy = order.approvedBy || req.user.id;
      order.approvedAt = order.approvedAt || new Date();
      await order.save();
      await transferInventoryForBulkOrderApproval(order);
      await notifyOrderDecision({
        order: { ...order.toObject(), userId: order.wholesaler },
        adminId: req.user._id,
        approved: true,
      });
      return res.status(200).json({
        message: "Order already approved",
        order,
      });
    }

    const orderedProduct = await Product.findById(order.product).select("productName quantity");
    if (!orderedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const availableQuantity = toNumber(orderedProduct.quantity);
    const orderedQuantity = toNumber(order.quantity);
    if (orderedQuantity <= 0 || availableQuantity < orderedQuantity) {
      return res.status(400).json({
        message: `${orderedProduct.productName} has only ${availableQuantity} available, requested ${orderedQuantity}`,
      });
    }

    order.orderStatus = "approved";
    order.paymentStatus = "paid";
    order.adminActionStatus = "confirmed";
    order.adminActionBy = req.user.id;
    order.adminActionAt = new Date();
    order.approvedBy = req.user.id;
    order.approvedAt = new Date();

    await order.save();

    if (order.sellPost) {
      const sellPost = await SellPost.findById(order.sellPost);
      if (sellPost) {
        sellPost.soldQuantity = Number(sellPost.soldQuantity || 0) + Number(order.quantity || 0);
        if (sellPost.soldQuantity > sellPost.quantity) {
          sellPost.soldQuantity = sellPost.quantity;
        }
        sellPost.remainingQuantity = Math.max(
          0,
          Number(sellPost.quantity || 0) - Number(sellPost.soldQuantity || 0),
        );
        if (sellPost.remainingQuantity === 0) {
          sellPost.isActive = false;
        }
        await sellPost.save();
      }
    }

    await transferInventoryForBulkOrderApproval(order);
    await notifyOrderDecision({
      order: { ...order.toObject(), userId: order.wholesaler },
      adminId: req.user._id,
      approved: true,
    });
    emitAdminProfitChanged(req, {
      source: "bulk_order",
      orderId: order.orderId,
      adminProfit: order.adminProfit,
    });

    return res.status(200).json({
      message: "Order approved successfully",
      order,
    });
  } catch (error) {
    console.error("ADMIN APPROVE ERROR:", error);

    if (String(error.message || "").includes("requested")) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// wholesaler reject order
export const adminRejectOrder = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const { orderId } = req.params;

    const order = await BulkOrder.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    order.orderStatus = "rejected";
    order.adminActionStatus = "rejected";
    order.adminActionBy = req.user.id;
    order.adminActionAt = new Date();
    order.rejectedBy = req.user.id;
    order.rejectedAt = new Date();

    await order.save();
    await notifyOrderDecision({
      order: { ...order.toObject(), userId: order.wholesaler },
      adminId: req.user._id,
      approved: false,
    });

    return res.status(200).json({
      message: "Order rejected successfully",
      order,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
