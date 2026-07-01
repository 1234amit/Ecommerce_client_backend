import express from "express";
import { verifySuperSeller } from "../../middleware/superseller/verifySuperSeller.js";
import { verifyToken } from "../../middleware/verifyToken.js";
import {
  addSupersalerProduct,
  changeSupersalerPassword,
  deleteSupersalerOwnProduct,
  getApprovedProductsForSuperseller,
  // getBulkPosts,
  getBulkPostsForSupersaler,
  getSupersalerBuyOrders,
  getSupersalerOrders,
  getSupersalerOwnProductById,
  getSupersalerOwnProducts,
  getSupersalerProfile,
  getSupersalerPurchasedProducts,
  // getSupersalerPurchases,
  supersalerCheckoutCOD,
  supersellerSellProduct,
  updateSupersalerOwnProduct,
  updateSupersalerProfile,
  updateSupersalerProfileImage,
} from "../../controllers/superseller/superSellerController.js";
import { createSellPost } from "../../controllers/superseller/sellPostController.js";
import {
  addToCart,
  deleteFromCart,
  getCart,
  sslSuccess,
  updateQuantityInCart,
} from "../../controllers/superseller/cartController.js";
import { initCheckoutSSL } from "../../controllers/superseller/sslCommarceController.js";

const router = express.Router();

// Get SuperSeller Profile
router.get("/profile", verifyToken, verifySuperSeller, getSupersalerProfile);

// Update SuperSeller Profile
router.put("/profile", verifyToken, verifySuperSeller, updateSupersalerProfile);

// Update SuperSeller Profile Image Only
router.put("/profile-image", verifyToken, verifySuperSeller, updateSupersalerProfileImage);

// Change SuperSeller Password
router.put(
  "/change-password",
  verifyToken,
  verifySuperSeller,
  changeSupersalerPassword
);

router.get("/products/approved", verifyToken, verifySuperSeller, getApprovedProductsForSuperseller);

router.put("/products/sell/:productId", verifyToken, verifySuperSeller, supersellerSellProduct);

// new 
router.post("/sell-post/create",verifyToken, verifySuperSeller, createSellPost);

// router.get("/my-sell-posts", verifyToken, verifySuperSeller, getMySellPosts);

// router.get("/bulk-posts", verifyToken, verifySuperSeller, getBulkPosts);

router.get("/bulk-posts", verifyToken, verifySuperSeller, getBulkPostsForSupersaler);

router.post("/add", verifyToken, verifySuperSeller, addToCart);
router.get("/", verifyToken, verifySuperSeller, getCart);
router.put("/cart/update", verifyToken, verifySuperSeller, updateQuantityInCart);
router.delete("/cart/remove/:productId", verifyToken, verifySuperSeller, deleteFromCart);
// router.post("/checkout", verifyToken, verifySuperSeller, checkoutCart);

router.post("/cart/checkout/init", verifyToken, verifySuperSeller, initCheckoutSSL);


// ➤ SUCCESS CALLBACK (SSLCommerz hits this)
router.post("/ssl-success", sslSuccess);


// ➤ FAIL CALLBACK
router.post("/ssl-fail", (req, res) => {
  return res.json({
    message: "Payment failed",
    data: req.body
  });
});


// ➤ CANCEL CALLBACK
router.post("/ssl-cancel", (req, res) => {
  return res.json({
    message: "Payment cancelled",
    data: req.body
  });
});


// cash on delivery

router.post("/cart/checkout/cod", verifyToken, verifySuperSeller, supersalerCheckoutCOD);

router.get(
  "/orders/buy",
  verifyToken,
  verifySuperSeller,
  getSupersalerBuyOrders
);


router.post("/product/create", verifyToken, verifySuperSeller, addSupersalerProduct);


// router.get("/get-own-product",verifyToken, verifySuperSeller, getSupersalerPurchases)

router.get("/get-supersaler-orders",verifyToken, verifySuperSeller, getSupersalerOrders)

router.get(
  "/my-products",
  verifyToken,
  getSupersalerOwnProducts
);


router.get("/my-products/:id", verifyToken, getSupersalerOwnProductById)

router.put(
  "/my-products/:id",
  verifyToken,
  updateSupersalerOwnProduct
);

router.delete(
  "/my-products/:id",
  verifyToken,
  deleteSupersalerOwnProduct
);

router.get(
  "/get-supersaler-purchased-products",
  verifyToken,
  getSupersalerPurchasedProducts
);

export default router;
