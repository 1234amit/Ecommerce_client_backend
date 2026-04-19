import mongoose from "mongoose";

const supersalerStockSchema = new mongoose.Schema(
  {
    supersaler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      default: 0,
    },

    unit: {
      type: String,
      enum: ["kg", "ton"],
      default: "kg",
    },
  },
  { timestamps: true }
);

const SupersalerStock = mongoose.model("SupersalerStock", supersalerStockSchema);
export default SupersalerStock;