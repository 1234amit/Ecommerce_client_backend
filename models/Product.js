import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    producer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sourceProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    image: {
      type: String,
      required: true,
    },

    secondaryImages: [
      {
        type: String,
      },
    ],

    productName: {
      type: String,
      required: true,
    },

    quantity: {
      type: String,
      required: true,
    },

    soldQuantity: {
      type: Number,
      default: 0,
    },

    soldAt: {
      type: Date,
      default: null,
    },

    price: {
      type: String,
      required: true,
    },

    previousPrice: {
      type: String,
      required: true,
    },

    priceHistory: [
      {
        price: {
          type: String,
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    description: {
      type: String,
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    priceType: {
      type: String,
      enum: ["per_unit", "total"],
      // required: true,
     },

    addToSellPost: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },

    // ✅ NEW FIELD: ADMIN APPROVAL STATUS
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    productType: {
  type: String,
  enum: ["bulk", "rental"],
  // required: true,
},

    // ✅ NEW FIELD: ADMIN WHO APPROVED
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ✅ NEW FIELD: APPROVED TIME
    approvedAt: {
      type: Date,
      default: null,
    },

    // ✅ NEW FIELD: WHEN SUPERSELLER / WHOLESALER START SELLING
    isSelling: {
      type: Boolean,
      default: false,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Update updatedAt timestamp before saving
productSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Product = mongoose.model("Product", productSchema);
export default Product;
