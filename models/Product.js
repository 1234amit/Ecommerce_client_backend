// // import mongoose from "mongoose";

// // const productSchema = new mongoose.Schema(
// //   {
// //     producer: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "User",
// //       required: true,
// //     },
// //     image: {
// //       type: String, // URL of the uploaded image
// //       required: true,
// //     },
// //     secondaryImages: [{
// //       type: String, // URLs of the uploaded secondary images
// //     }],
// //     productName: {
// //       type: String,
// //       required: true,
// //     },
// //     quantity: {
// //       type: String,
// //       required: true,
// //     },
// //     price: {
// //       type: String,
// //       required: true,
// //     },
// //     previousPrice: {
// //       type: String,
// //       required: true,
// //     },
// //     priceHistory: [{
// //       price: {
// //         type: String,
// //         required: true
// //       },
// //       changedAt: {
// //         type: Date,
// //         default: Date.now
// //       }
// //     }],
// //     description: {
// //       type: String,
// //       required: true,
// //     },
// //     category: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "Category",
// //       required: true,
// //     },

// //     addToSellPost: {
// //       type: String,
// //       enum: ['yes', 'no'],
// //       default: 'no'
// //     },
// //     createdAt: {
// //       type: Date,
// //       default: Date.now
// //     },
// //     updatedAt: {
// //       type: Date,
// //       default: Date.now
// //     }
// //   },
// //   { timestamps: true }
// // );

// // // Update the updatedAt timestamp before saving
// // productSchema.pre('save', function(next) {
// //   this.updatedAt = new Date();
// //   next();
// // });

// // const Product = mongoose.model("Product", productSchema);
// // export default Product;


// import mongoose from "mongoose";

// const productSchema = new mongoose.Schema(
//   {
//     producer: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     image: {
//       type: String,
//       required: true,
//     },

//     secondaryImages: [
//       {
//         type: String,
//       },
//     ],

//     productName: {
//       type: String,
//       required: true,
//     },

//     quantity: {
//       type: String,
//       required: true,
//     },

//     price: {
//       type: String,
//       required: true,
//     },

//     previousPrice: {
//       type: String,
//       required: true,
//     },

//     priceHistory: [
//       {
//         price: {
//           type: String,
//           required: true,
//         },
//         changedAt: {
//           type: Date,
//           default: Date.now,
//         },
//       },
//     ],

//     description: {
//       type: String,
//       required: true,
//     },

//     category: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Category",
//       required: true,
//     },

//     addToSellPost: {
//       type: String,
//       enum: ["yes", "no"],
//       default: "no",
//     },

//     // ✅ NEW FIELD: ADMIN APPROVAL STATUS
//     status: {
//       type: String,
//       enum: ["pending", "approved", "rejected"],
//       default: "pending",
//     },

//     // ✅ NEW FIELD: ADMIN WHO APPROVED
//     approvedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },

//     // ✅ NEW FIELD: APPROVED TIME
//     approvedAt: {
//       type: Date,
//       default: null,
//     },

//     // ✅ NEW FIELD: WHEN SUPERSELLER / WHOLESALER START SELLING
//     isSelling: {
//       type: Boolean,
//       default: false,
//     },

//     createdAt: {
//       type: Date,
//       default: Date.now,
//     },

//     updatedAt: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   { timestamps: true }
// );

// // Update updatedAt timestamp before saving
// productSchema.pre("save", function (next) {
//   this.updatedAt = new Date();
//   next();
// });

// const Product = mongoose.model("Product", productSchema);
// export default Product;



import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    producer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

    addToSellPost: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },

    // ✅ ADMIN APPROVAL STATUS
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // ✅ ADMIN WHO APPROVED
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ✅ APPROVED TIME
    approvedAt: {
      type: Date,
      default: null,
    },

    // ✅ WHEN SUPERSELLER / WHOLESALER START SELLING
    isSelling: {
      type: Boolean,
      default: false,
    },

    // ✅ WHO IS SELLING (Supersaler / Wholesaler)
    sellingBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ✅ SELLER ROLE
    sellingRole: {
      type: String,
      enum: ["supersaler", "wholesaler", null],
      default: null,
    },

    // ✅ PRODUCER CONFIRMATION
    sellingConfirmedByProducer: {
      type: Boolean,
      default: false,
    },

    // ✅ PRODUCER CONFIRM TIME
    sellingConfirmedAt: {
      type: Date,
      default: null,
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