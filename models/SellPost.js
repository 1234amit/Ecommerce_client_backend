// import mongoose from "mongoose";

// const sellPostSchema = new mongoose.Schema(
//   {
//     product: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//     },

//     producer: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     seller: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     sellerRole: {
//       type: String,
//       enum: ["supersaler", "wholesaler"],
//       required: true,
//     },

//     // retail or bulk
//     sellType: {
//       type: String,
//       enum: ["retail", "bulk"],
//       required: true,
//     },

//     // producer base price (per kg)
//     basePricePerKg: {
//       type: Number,
//       required: true,
//     },

//     // supersaler set selling price (per kg)
//     sellingPricePerKg: {
//       type: Number,
//       required: true,
//     },

//     // how much supersaler increased price
//     increasedAmountPerKg: {
//       type: Number,
//       default: 0,
//     },

//     // commission percent like 1% or 2%
//     commissionPercent: {
//       type: Number,
//       default: 0,
//     },

//     // commission per kg
//     commissionAmountPerKg: {
//       type: Number,
//       default: 0,
//     },

//     // quantity supersaler wants to sell
//     quantity: {
//       type: Number,
//       required: true,
//     },

//     unit: {
//       type: String,
//       enum: ["kg", "ton"],
//       required: true,
//     },

//     totalPrice: {
//       type: Number,
//       default: 0,
//     },

//     totalCommission: {
//       type: Number,
//       default: 0,
//     },

//     district: {
//       type: String,
//       required: true,
//     },

//     thana: {
//       type: String,
//       required: true,
//     },

//     visibility: {
//       type: String,
//       enum: ["consumer", "supersaler", "wholesaler", "all"],
//       default: "consumer",
//     },

//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   { timestamps: true }
// );

// // auto calculate total price + commission
// // sellPostSchema.pre("save", function (next) {
// //   let qtyInKg = this.quantity;

// //   if (this.unit === "ton") {
// //     qtyInKg = this.quantity * 1000;
// //   }

// //   this.increasedAmountPerKg = this.sellingPricePerKg - this.basePricePerKg;

// //   if (this.increasedAmountPerKg < 0) {
// //     this.increasedAmountPerKg = 0;
// //   }

// //   this.commissionAmountPerKg =
// //     (this.sellingPricePerKg * this.commissionPercent) / 100;

// //   this.totalPrice = qtyInKg * this.sellingPricePerKg;
// //   this.totalCommission = qtyInKg * this.commissionAmountPerKg;

// //   next();

// sellPostSchema.pre("save", function (next) {
//   let qtyInKg = this.quantity;

//   if (this.unit === "ton") {
//     qtyInKg = this.quantity * 1000;
//   }

//   this.increasedAmountPerKg = this.sellingPricePerKg - this.basePricePerKg;

//   if (this.increasedAmountPerKg < 0) {
//     this.increasedAmountPerKg = 0;
//   }

//   // 🔥 commission calculation
//   this.commissionAmountPerKg =
//     (this.sellingPricePerKg * this.commissionPercent) / 100;

//   this.totalPrice = qtyInKg * this.sellingPricePerKg;

//   this.totalCommission = qtyInKg * this.commissionAmountPerKg;

//   next();
// });

// const SellPost = mongoose.model("SellPost", sellPostSchema);
// export default SellPost;


import mongoose from "mongoose";

const sellPostSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    producer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sellerRole: {
      type: String,
      enum: ["supersaler", "wholesaler"],
      required: true,
    },

    // retail or bulk
    sellType: {
      type: String,
      enum: ["retail", "bulk"],
      required: true,
    },

    // producer base price (per kg)
    basePricePerKg: {
      type: Number,
      required: true,
    },

    // supersaler/wholesaler set selling price (per kg)
    sellingPricePerKg: {
      type: Number,
      required: true,
    },

    // how much seller increased price
    increasedAmountPerKg: {
      type: Number,
      default: 0,
    },

    // commission percent like 1% or 2%
    commissionPercent: {
      type: Number,
      default: 0,
    },

    // commission per kg
    commissionAmountPerKg: {
      type: Number,
      default: 0,
    },

    // quantity seller wants to sell
    quantity: {
      type: Number,
      required: true,
    },

    // how much already sold from this post
    soldQuantity: {
      type: Number,
      default: 0,
    },

    // remaining stock for this post
    remainingQuantity: {
      type: Number,
      default: 0,
    },

    unit: {
      type: String,
      enum: ["kg", "ton"],
      required: true,
    },

    totalPrice: {
      type: Number,
      default: 0,
    },

    totalCommission: {
      type: Number,
      default: 0,
    },

    district: {
      type: String,
      required: true,
    },

    thana: {
      type: String,
      required: true,
    },

    visibility: {
      type: String,
      enum: ["consumer", "supersaler", "wholesaler", "all"],
      default: "consumer",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ============================
// Pre Save Calculation
// ============================
sellPostSchema.pre("save", function (next) {
  let qtyInKg = this.quantity;

  if (this.unit === "ton") {
    qtyInKg = this.quantity * 1000;
  }

  // price increased calculation
  this.increasedAmountPerKg = this.sellingPricePerKg - this.basePricePerKg;

  if (this.increasedAmountPerKg < 0) {
    this.increasedAmountPerKg = 0;
  }

  // commission per kg
  this.commissionAmountPerKg =
    (this.sellingPricePerKg * this.commissionPercent) / 100;

  // total price
  this.totalPrice = qtyInKg * this.sellingPricePerKg;

  // total commission
  this.totalCommission = qtyInKg * this.commissionAmountPerKg;

  // remaining quantity calculation
  if (this.soldQuantity < 0) this.soldQuantity = 0;

  this.remainingQuantity = this.quantity - this.soldQuantity;

  if (this.remainingQuantity < 0) {
    this.remainingQuantity = 0;
  }

  // auto disable if stock finished
  if (this.remainingQuantity === 0) {
    this.isActive = false;
  }

  next();
});

const SellPost = mongoose.model("SellPost", sellPostSchema);
export default SellPost;