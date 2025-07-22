import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    producer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: {
      type: String, // URL of the uploaded image
      required: true,
    },
    secondaryImages: [{
      type: String, // URLs of the uploaded secondary images
    }],
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    previousPrice: {
      type: String,
      required: true,
    },
    priceHistory: [{
      price: {
        type: String,
        required: true
      },
      changedAt: {
        type: Date,
        default: Date.now
      }
    }],
    description: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    addToSellPost: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Update the updatedAt timestamp before saving
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Product = mongoose.model("Product", productSchema);
export default Product;
