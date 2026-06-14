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

    notes: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("BulkOrder", bulkOrderSchema);