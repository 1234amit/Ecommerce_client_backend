// import axios from "axios";
// import SupersalerBuyProductCart from "../../models/supersalerBuyProductCart.js";
// import Product from "../../models/Product.js";

// export const initCheckoutSSL = async (req, res) => {
//   try {
//     const user = req.user;

//     if (user.role !== "supersaler") {
//       return res.status(403).json({ message: "Unauthorized" });
//     }

//     // const cart = await SupersalerBuyProductCart.findOne({ supersaler: user._id }).populate({
//     //   path: "items.product",
//     //   populate: { path: "producer" }
//     // });

//     const cart = await SupersalerBuyProductCart.findOne({
//         supersaler: user._id   // must be ObjectId
//         }).populate({
//         path: "items.product",
//         populate: { path: "producer" }
//         });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     let totalAmount = 0;

//     cart.items.forEach(item => {
//       totalAmount += item.product.pricePerKg * item.quantity;
//     });

//     const tran_id = "TXN_" + Date.now();

//     const data = {
//       store_id: process.env.SSL_STORE_ID,
//       store_passwd: process.env.SSL_STORE_PASSWORD,
//       total_amount: totalAmount,
//       currency: "BDT",
//       tran_id: tran_id,

//       success_url: `http://localhost:4000/api/v1/supersaler/ssl-success`,
//       fail_url: `http://localhost:4000/api/v1/supersaler/ssl-fail`,
//       cancel_url: `http://localhost:4000/api/v1/supersaler/ssl-cancel`,

//       cus_name: user.name,
//       cus_email: user.email || "test@gmail.com",
//       cus_phone: user.phone,

//       shipping_method: "NO",
//       product_name: "Agri Products",
//       product_category: "Agriculture",
//       product_profile: "general"
//     };

//     const response = await axios.post(
//       "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
//       data
//     );

//     return res.json({
//       message: "Payment initiated",
//       gateway: response.data,
//       paymentUrl: response.data.GatewayPageURL
//     });

//   } catch (error) {
//     return res.status(500).json({
//       message: "SSL Init Error",
//       error: error.message
//     });
//   }
// };


import axios from "axios";
import SupersalerBuyProductCart from "../../models/supersalerBuyProductCart.js";
import Product from "../../models/Product.js";
import Payment from "../../models/Payment.js";


// export const initCheckoutSSL = async (req, res) => {
//   try {
//     const user = req.user;

//     if (!user || user.role !== "supersaler") {
//       return res.status(403).json({ message: "Unauthorized" });
//     }

//     // ✅ Get cart
//     const cart = await SupersalerBuyProductCart.findOne({
//       supersaler: user._id,
//     }).populate({
//       path: "items.product",
//       populate: { path: "producer" },
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     // ✅ Calculate total amount
//     let totalAmount = 0;

//     cart.items.forEach((item) => {
//       totalAmount += item.product.pricePerKg * item.quantity;
//     });

//     // ✅ transaction id
//     const tran_id = "TXN_" + Date.now();

//     // ✅ IMPORTANT: SSLCommerz requires form-data format
//     const params = new URLSearchParams();

//     params.append("store_id", process.env.SSL_STORE_ID);
//     params.append("store_passwd", process.env.SSL_STORE_PASSWORD);
//     params.append("total_amount", totalAmount);
//     params.append("currency", "BDT");
//     params.append("tran_id", tran_id);

//     params.append(
//       "success_url",
//       "http://localhost:4000/api/v1/supersaler/ssl-success"
//     );
//     params.append(
//       "fail_url",
//       "http://localhost:4000/api/v1/supersaler/ssl-fail"
//     );
//     params.append(
//       "cancel_url",
//       "http://localhost:4000/api/v1/supersaler/ssl-cancel"
//     );

//     params.append("cus_name", user.name || "Test User");
//     params.append("cus_email", user.email || "test@gmail.com");
//     params.append("cus_phone", user.phone || "01700000000");

//     params.append("shipping_method", "NO");
//     params.append("product_name", "Agri Products");
//     params.append("product_category", "Agriculture");
//     params.append("product_profile", "general");

//     // 🔥 DEBUG (VERY IMPORTANT)
//     console.log("STORE ID:", process.env.SSL_STORE_ID);
//     console.log("STORE PASS:", process.env.SSL_STORE_PASSWORD);

//     // ✅ SSL REQUEST
//     const response = await axios.post(
//       "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
//       params,
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       }
//     );

//     return res.json({
//       message: "Payment initiated",
//       paymentUrl: response.data?.GatewayPageURL || "",
//       gateway: response.data,
//       tran_id,
//       totalAmount,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "SSL Init Error",
//       error: error.message,
//     });
//   }
// };

export const initCheckoutSSL = async (req, res) => {
  try {
    const user = req.user;

    // ✅ check role
    if (!user || user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // ✅ get cart
    const cart = await SupersalerBuyProductCart.findOne({
      supersaler: user._id,
    }).populate({
      path: "items.product",
      populate: { path: "producer" },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // ✅ calculate total
    let totalAmount = 0;

    cart.items.forEach((item) => {
      totalAmount += item.product.pricePerKg * item.quantity;
    });

    // ✅ transaction id
    // const tran_id = "TXN_" + Date.now();
    const tran_id = `TXN_${user._id}_${Date.now()}`;

    // ✅ CREATE PAYMENT RECORD (🔥 THIS FIXES YOUR ERROR)
    await Payment.create({
      userId: user._id,          // FIX: required field
      orderId: tran_id,          // FIX: required field
      tran_id: tran_id,
      amount: totalAmount,
      status: "pending",
    });

    // ✅ SSL FORM DATA
    const params = new URLSearchParams();

    params.append("store_id", process.env.SSL_STORE_ID);
    params.append("store_passwd", process.env.SSL_STORE_PASSWORD);
    params.append("total_amount", totalAmount);
    params.append("currency", "BDT");
    params.append("tran_id", tran_id);

    params.append(
      "success_url",
      "https://ecommerce-client-backend-1.onrender.com/api/v1/supersaler/ssl-success"
    );

    params.append(
      "fail_url",
      "https://ecommerce-client-backend-1.onrender.com/api/v1/supersaler/ssl-fail"
    );

    params.append(
      "cancel_url",
      "https://ecommerce-client-backend-1.onrender.com/api/v1/supersaler/ssl-cancel"
    );

    params.append("cus_name", user.name || "Test User");
    params.append("cus_email", user.email || "test@gmail.com");
    params.append("cus_phone", user.phone || "01700000000");

    params.append("shipping_method", "NO");
    params.append("product_name", "Agri Products");
    params.append("product_category", "Agriculture");
    params.append("product_profile", "general");

    // 🔥 DEBUG (IMPORTANT)
    console.log("STORE ID:", process.env.SSL_STORE_ID);
    console.log("STORE PASS:", process.env.SSL_STORE_PASSWORD);

    // ✅ CALL SSL
    const response = await axios.post(
      "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return res.json({
      message: "Payment initiated",
      paymentUrl: response.data?.GatewayPageURL || "",
      gateway: response.data,
      tran_id,
      totalAmount,
    });
  } catch (error) {
    return res.status(500).json({
      message: "SSL Init Error",
      error: error.message,
    });
  }
};