import mongoose from "mongoose";

const supersalerBuyProductCartSchema = new mongoose.Schema(
  {
    supersaler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
  },
  { timestamps: true }
);

const SupersalerBuyProductCart = mongoose.model(
  "SupersalerBuyProductCart",
  supersalerBuyProductCartSchema
);

export default SupersalerBuyProductCart;