import express from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { verifyWholesaler } from "../../middleware/wholeseller/verifyWholesaler.js";
import {
  changeWholesalerPassword,
  createBulkOrder,
  getApprovedProductsForWholesaler,
  getBulkPostDetailsForWholesaler,
  // getBulkPosts,
  getBulkPostsForWholesaler,
  getProductDetailsForWholesaler,
  getWholesalerOrderProducts,
  getWholesalerOwnOrders,
  markWholesalerOrderProductSoldOffline,
  getWholesalerProfile,
  payBulkOrderCOD,
  updateWholesalerProfile,
  updateWholesalerProfileImage,
  wholesalerSellProduct,
} from "../../controllers/wholeseller/wholesalerController.js";
import { verifyTokenwholesaler } from "../../middleware/wholeseller/verifyTokenwholesaler.js";

const router = express.Router();

// Get Wholesaler Profile
router.get("/profile", verifyToken, verifyWholesaler, getWholesalerProfile);

// Update Wholesaler Profile
router.put("/profile", verifyToken, verifyWholesaler, updateWholesalerProfile);

// Update Wholesaler Profile Image Only
router.put("/profile-image", verifyToken, verifyWholesaler, updateWholesalerProfileImage);

// Change Wholesaler Password
router.put(
  "/change-password",
  verifyToken,
  verifyWholesaler,
  changeWholesalerPassword
);

router.get("/products/approved", verifyToken, verifyWholesaler, getApprovedProductsForWholesaler);

// router.put("/products/sell/:productId", verifyToken, verifyWholesaler, wholesalerSellProduct);

router.put("/products/sell/:productId", verifyToken, verifyWholesaler, wholesalerSellProduct);

// get bulk post
router.get("/bulk-posts", verifyTokenwholesaler, getBulkPostsForWholesaler);


router.get(
  "/products/:productId",
  verifyToken,
  verifyWholesaler,
  getProductDetailsForWholesaler
);


router.get(
  "/bulk-posts/:postId",
  verifyTokenwholesaler,
  getBulkPostDetailsForWholesaler
);


router.post(
  "/orders",
  verifyTokenwholesaler,
  createBulkOrder
);


router.get(
  "/orders/my-orders",
  verifyTokenwholesaler,
  getWholesalerOwnOrders
);


router.get(
  "/orders/products",
  verifyTokenwholesaler,
  getWholesalerOrderProducts
);

router.delete(
  "/orders/products/:orderId/sold",
  verifyTokenwholesaler,
  markWholesalerOrderProductSoldOffline
);

router.put(
  "/orders/pay/:orderId",
  verifyTokenwholesaler,
  payBulkOrderCOD
);

export default router;
