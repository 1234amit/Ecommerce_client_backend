import Product from "../../models/Product.js";
import Wallet from "../../models/Wallet.js";
import Transaction from "../../models/Transaction.js";
import SupersalerBuyProductCart from "../../models/supersalerBuyProductCart.js";


// =============================
// ✅ Wallet helper
// =============================
const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await Wallet.create({
      user: userId,
      balance: 0,
    });
  }

  return wallet;
};


// =============================
// ✅ ADD TO CART
// =============================
export const addToCart = async (req, res) => {
  try {
    if (req.user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        message: "productId and quantity required",
      });
    }

    const qty = Number(quantity);

    if (qty <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    // =============================
    // Get product
    // =============================
    const product = await Product.findById(productId).populate("producer");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.status !== "approved") {
      return res.status(400).json({ message: "Product not approved" });
    }

    // =============================
    // District & Thana check
    // =============================
    if (
      product.producer.district !== req.user.district ||
      product.producer.thana !== req.user.thana
    ) {
      return res.status(403).json({
        message: "Same district & thana products only allowed",
      });
    }

    // =============================
    // Stock check
    // =============================
    if (product.quantity < qty) {
      return res.status(400).json({
        message: "Not enough stock",
        available: product.quantity,
      });
    }

    // =============================
    // Find cart (IMPORTANT FIX)
    // =============================
    let cart = await SupersalerBuyProductCart.findOne({
      supersaler: req.user._id,
    });

    // =============================
    // Create cart
    // =============================
    if (!cart) {
      cart = await SupersalerBuyProductCart.create({
        supersaler: req.user._id,
        items: [
          {
            product: productId,
            quantity: qty,
          },
        ],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += qty;
      } else {
        cart.items.push({
          product: productId,
          quantity: qty,
        });
      }

      await cart.save();
    }

    return res.status(200).json({
      message: "Added to cart successfully",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// =============================
// ✅ GET CART
// =============================
export const getCart = async (req, res) => {
  try {
    const cart = await SupersalerBuyProductCart.findOne({
      supersaler: req.user._id,
    }).populate({
      path: "items.product",
      populate: { path: "producer" },
    });

    if (!cart) {
      return res.json({
        message: "Cart empty",
        items: [],
      });
    }

    return res.json({
      message: "Cart fetched successfully",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// =============================
// ✅ CHECKOUT CART (BUY PROCESS)
// =============================
// export const checkoutCart = async (req, res) => {
//   try {
//     if (req.user.role !== "supersaler") {
//       return res.status(403).json({ message: "Unauthorized access" });
//     }

//     const cart = await SupersalerBuyProductCart.findOne({
//       supersaler: req.user._id,
//     }).populate({
//       path: "items.product",
//       populate: { path: "producer" },
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     const supersalerWallet = await getOrCreateWallet(req.user._id);

//     let totalCost = 0;

//     // =============================
//     // Calculate total
//     // =============================
//     for (let item of cart.items) {
//       const product = item.product;
//       const qty = item.quantity;

//       if (!product) continue;

//       if (product.quantity < qty) {
//         return res.status(400).json({
//           message: `Not enough stock for ${product.productName}`,
//         });
//       }

//       totalCost += product.pricePerKg * qty;
//     }

//     // =============================
//     // Wallet check
//     // =============================
//     if (supersalerWallet.balance < totalCost) {
//       return res.status(400).json({
//         message: "Insufficient balance",
//         balance: supersalerWallet.balance,
//         required: totalCost,
//       });
//     }

//     // =============================
//     // Deduct supersaler money
//     // =============================
//     supersalerWallet.balance -= totalCost;
//     await supersalerWallet.save();

//     // =============================
//     // Process each product
//     // =============================
//     for (let item of cart.items) {
//       const product = await Product.findById(item.product._id).populate("producer");
//       const qty = item.quantity;

//       const itemCost = product.pricePerKg * qty;

//       // reduce stock
//       product.quantity -= qty;
//       await product.save();

//       // producer wallet
//       const producerWallet = await getOrCreateWallet(product.producer._id);
//       producerWallet.balance += itemCost;
//       await producerWallet.save();

//       // transaction
//       await Transaction.create({
//         fromUser: req.user._id,
//         toUser: product.producer._id,
//         amount: itemCost,
//         type: "purchase",
//         description: `Bought ${qty} ${product.unit} of ${product.productName}`,
//         product: product._id,
//       });
//     }

//     // =============================
//     // Clear cart
//     // =============================
//     cart.items = [];
//     await cart.save();

//     return res.status(200).json({
//       message: "Checkout successful",
//       totalPaid: totalCost,
//       remainingBalance: supersalerWallet.balance,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

const getWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId, balance: 0 });
  return wallet;
};

// export const sslSuccess = async (req, res) => {
//   try {
//     const userId = req.body.cus_id; // or store in session/db

//     const cart = await SupersalerBuyProductCart.findOne({ user: userId }).populate({
//       path: "items.product",
//       populate: { path: "producer" }
//     });

//     if (!cart) {
//       return res.status(404).json({ message: "Cart not found" });
//     }

//     let total = 0;

//     for (let item of cart.items) {
//       const product = item.product;
//       const qty = item.quantity;

//       const price = product.pricePerKg * qty;
//       total += price;

//       // reduce stock
//       product.quantity -= qty;
//       await product.save();

//       // pay producer
//       const producerWallet = await getWallet(product.producer._id);
//       producerWallet.balance += price;
//       await producerWallet.save();

//       await Transaction.create({
//         fromUser: userId,
//         toUser: product.producer._id,
//         amount: price,
//         type: "ssl_purchase",
//         product: product._id
//       });
//     }

//     // clear cart
//     cart.items = [];
//     await cart.save();

//     return res.json({
//       message: "Payment successful & purchase completed",
//       totalPaid: total
//     });

//   } catch (error) {
//     return res.status(500).json({
//       message: "SSL Success Error",
//       error: error.message
//     });
//   }
// };


export const sslSuccess = async (req, res) => {
  try {
    const { tran_id } = req.body;

    const payment = await Payment.findOne({ tran_id });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const userId = payment.user;

    const cart = await SupersalerBuyProductCart.findOne({
      supersaler: userId
    }).populate({
      path: "items.product",
      populate: { path: "producer" }
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    let total = 0;

    for (let item of cart.items) {
      const product = item.product;
      const qty = item.quantity;

      const price = product.pricePerKg * qty;
      total += price;

      product.quantity -= qty;
      await product.save();

      const producerWallet = await getWallet(product.producer._id);
      producerWallet.balance += price;
      await producerWallet.save();
    }

    // ✅ CLEAR CART
    cart.items = [];
    await cart.save();

    // update payment
    payment.status = "success";
    await payment.save();

    return res.json({
      message: "Payment successful",
      totalPaid: total
    });

  } catch (error) {
    return res.status(500).json({
      message: "SSL Success Error",
      error: error.message
    });
  }
};