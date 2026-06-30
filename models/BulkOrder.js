// models/BulkOrder.js
import mongoose from "mongoose";

const bulkOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },

    wholesaler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    producer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sellPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellPost",
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    unitPrice: {
      type: Number,
      required: true,
    },

    baseUnitPrice: {
      type: Number,
      default: 0,
    },

    profitRate: {
      type: Number,
      default: 0,
    },

    adminProfit: {
      type: Number,
      default: 0,
    },

    subtotal: {
      type: Number,
      default: 0,
    },

    deliveryFee: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      default: "cash_on_delivery",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ],
      default: "pending",
    },

    adminActionStatus: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },

    adminActionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    adminActionAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    inventoryDeductedAt: {
      type: Date,
      default: null,
    },

    notes: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("BulkOrder", bulkOrderSchema);
