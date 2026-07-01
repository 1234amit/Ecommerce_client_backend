import express from "express";
import {
  verifyAdmin,
  verifyToken,
} from "../../middleware/admin/verifyAdmin.js";
import {
  changeAdminPassword,
  createAdminCategory,
  deleteAdminCategory,
  getAdminProfile,
  getAdminCategories,
  getAdminProfitReport,
  getAdminSystemLogs,
  updateAdminProfile,
  updateAdminProfileImage,
  updateAdminCategory,
  getSuperAdminDevices,
  revokeSuperAdminDevice,
  getAllUsers,
  getAdminUserDetails,
  getUserById,
  deleteUserById,
  getAllConsumers,
  getConsumerById,
  deleteConsumerById,
  searchConsumer,
  getAllSuperSalers,
  getSuperSalerById,
  searchSuperSaler,
  deleteSuperSalerById,
  getPendingSuperSalers,
  approveSuperSaler,
  getAllWholesalers,
  getWholesalerById,
  searchWholesaler,
  deleteWholesalerById,
  getPendingWholesalers,
  approveWholesaler,
  getAllProducers,
  getProducerById,
  deleteProducerById,
  searchProducer,
  getPendingProducers,
  approveProducer,
  deleteProductById,
  getPendingProducts,
  getApprovedProducts,
  getRejectedProducts,
  getAllProductsAdmin,
  getProductDetailsByAdmin,
  approveProduct,
  rejectProduct,
  updateProductProfitRate,
  getAllSellPostsForAdmin,
  getAllSupersalerOrdersForAdmin,
  updateSupersalerOrderStatus,
  getSupersalerPurchasedProductsForAdmin,
  getWholesalerPurchasedProductsForAdmin,
  getProducerPurchasedProductsForAdmin,
  getPendingSupersalerProductsForAdmin,
  approveSupersalerProductByAdmin,
  rejectSupersalerProductByAdmin,
  getApprovedSupersalerProducts,
  getAllWholesalerOrdersForAdmin,
  updateWholesalerOrderStatus,
  getAllConsumerOrdersForAdmin,
  updateConsumerOrderStatus,
  adminGetWholesalerOrders,
  adminApproveOrder,
  adminRejectOrder,
  approveAllProductByAdmin,
  rejectAllProductByAdmin,
} from "../../controllers/admin/adminController.js";
const router = express.Router();

// Get Admin Profile
router.get("/profile", verifyToken, verifyAdmin, getAdminProfile);

// Update Admin Profile
router.put("/profile", verifyToken, verifyAdmin, updateAdminProfile);

// Update Admin Profile Image Only
router.put("/profile-image", verifyToken, verifyAdmin, updateAdminProfileImage);

// Change Admin Password
router.put("/change-password", verifyToken, verifyAdmin, changeAdminPassword);
router.get("/devices", verifyToken, verifyAdmin, getSuperAdminDevices);
router.delete("/devices/:sessionId", verifyToken, verifyAdmin, revokeSuperAdminDevice);

router.get("/profits", verifyToken, verifyAdmin, getAdminProfitReport);
router.get("/logs", verifyToken, verifyAdmin, getAdminSystemLogs);
router.get("/categories", verifyToken, verifyAdmin, getAdminCategories);
router.post("/categories", verifyToken, verifyAdmin, createAdminCategory);
router.put("/categories/:categoryId", verifyToken, verifyAdmin, updateAdminCategory);
router.delete("/categories/:categoryId", verifyToken, verifyAdmin, deleteAdminCategory);

// Get all users (Admin Only)
router.get("/users", verifyToken, verifyAdmin, getAllUsers);

router.get("/users/:id/details", verifyToken, verifyAdmin, getAdminUserDetails);

// Get a specific user by ID (Admin Only)
router.get("/users/:id", verifyToken, verifyAdmin, getUserById);

// ✅ Delete User by ID (Admin Only)
router.delete("/users/:id", verifyToken, verifyAdmin, deleteUserById);

// ✅ Get Consumers (Admin can see all, Consumers see themselves)
router.get("/all-consumer/", verifyToken, verifyAdmin, getAllConsumers);

// ✅ Get Single Consumer by ID (Admin Only)
router.get("/all-consumer/:id", verifyToken, verifyAdmin, getConsumerById);

// ✅ Delete Consumer by ID (Admin Only)
router.delete(
  "/all-consumer/:id",
  verifyToken,
  verifyAdmin,
  deleteConsumerById
);
//search consumer by admin
router.get("/search", verifyToken, verifyAdmin, searchConsumer);

// pending superseller by admin
router.get(
  "/all-supersaler/pending",
  verifyToken,
  verifyAdmin,
  getPendingSuperSalers
);

// ✅ Get all SuperSalers (Admin Only)
router.get("/all-supersaler", verifyToken, verifyAdmin, getAllSuperSalers);

// ✅ Search for SuperSalers (Admin Only)
router.get(
  "/all-supersaler/search",
  verifyToken,
  verifyAdmin,
  searchSuperSaler
);

// ✅ Get a single SuperSaler by ID (Admin Only)
router.get("/all-supersaler/:id", verifyToken, verifyAdmin, getSuperSalerById);

// ✅ Delete a SuperSaler by ID (Admin Only)
router.delete(
  "/all-supersaler/:id",
  verifyToken,
  verifyAdmin,
  deleteSuperSalerById
);

router.put(
  "/all-supersaler/approve/:id",
  verifyToken,
  verifyAdmin,
  approveSuperSaler
);

router.get("/all-wholesalers", verifyToken, verifyAdmin, getAllWholesalers);
router.get(
  "/all-wholesalers/search",
  verifyToken,
  verifyAdmin,
  searchWholesaler
);
router.get("/all-wholesalers/:id", verifyToken, verifyAdmin, getWholesalerById);
router.delete(
  "/all-wholesalers/:id",
  verifyToken,
  verifyAdmin,
  deleteWholesalerById
);

router.get(
  "/pending-wholesalers",
  verifyToken,
  verifyAdmin,
  getPendingWholesalers
);

router.put(
  "/approve-wholesaler/:id",
  verifyToken,
  verifyAdmin,
  approveWholesaler
);

router.get("/all-producer", verifyToken, verifyAdmin, getAllProducers);
router.get("/all-producer/search", verifyToken, verifyAdmin, searchProducer);
router.delete(
  "/all-producer/:id",
  verifyToken,
  verifyAdmin,
  deleteProducerById
);
router.get("/all-producer/:id", verifyToken, verifyAdmin, getProducerById);

router.get("/pending-producers", verifyToken, verifyAdmin, getPendingProducers);
router.put("/approve-producer/:id", verifyToken, verifyAdmin, approveProducer);

// Get all products (Admin Only)
// router.get("/all-products", verifyToken, verifyAdmin, getAllProducts);

// // Get single product by ID (Admin Only)
// router.get("/all-products/:id", verifyToken, verifyAdmin, getProductById);

// // Delete product by ID (Admin Only)
router.delete("/all-products/:id", verifyToken, verifyAdmin, deleteProductById);

router.get("/products/pending", verifyToken, verifyAdmin, getPendingProducts);
router.get("/products/approved", verifyToken, verifyAdmin, getApprovedProducts);
router.get("/products/rejected", verifyToken, verifyAdmin, getRejectedProducts);

router.get("/products/all", verifyToken, verifyAdmin, getAllProductsAdmin);
router.get("/products/:productId", verifyToken, verifyAdmin, getProductDetailsByAdmin);
router.patch("/products/:productId/profit-rate", verifyToken, verifyAdmin, updateProductProfitRate);

router.put("/products/approve/:productId", verifyToken, verifyAdmin, approveProduct);
router.put("/products/reject/:productId", verifyToken, verifyAdmin, rejectProduct);

//get all sell post by admin


router.get("/sell-posts", verifyToken,verifyAdmin,  getAllSellPostsForAdmin);


router.get("/view-supersaler-product", verifyToken, verifyAdmin, getAllSupersalerOrdersForAdmin)


router.patch("/update-status/:orderId", verifyToken, verifyAdmin, updateSupersalerOrderStatus)


router.get("/view-wholesaler-product", verifyToken, verifyAdmin, getAllWholesalerOrdersForAdmin)

router.patch("/update-wholesaler-status/:orderId", verifyToken, verifyAdmin, updateWholesalerOrderStatus)

router.get("/view-consumer-product", verifyToken, verifyAdmin, getAllConsumerOrdersForAdmin)

router.patch("/update-consumer-status/:orderId", verifyToken, verifyAdmin, updateConsumerOrderStatus)


router.get(
  "/supersaler-purchases",
  verifyToken, verifyAdmin,
  getSupersalerPurchasedProductsForAdmin
);

router.get(
  "/wholesaler-purchases",
  verifyToken, verifyAdmin,
  getWholesalerPurchasedProductsForAdmin
);

router.get(
  "/producer-purchases",
  verifyToken, verifyAdmin,
  getProducerPurchasedProductsForAdmin
);

router.get(
  "/supersaler-products/pending",
  verifyToken, verifyAdmin,
  getPendingSupersalerProductsForAdmin
);

router.patch(
  "/supersaler-products/:productId/approve",
  verifyToken, verifyAdmin,
  approveSupersalerProductByAdmin
);
// all product approved into all users
router.patch(
  "/all/:productId/approve",
  verifyToken, verifyAdmin,
  approveAllProductByAdmin
);

router.patch(
  "/supersaler-products/:productId/reject",
  verifyToken, verifyAdmin,
  rejectSupersalerProductByAdmin
);

// all api reject product

router.patch(
  "/all/:productId/reject",
  verifyToken, verifyAdmin,
  rejectAllProductByAdmin
);

router.get(
  "/supersaler-products/approved", verifyToken, verifyAdmin,
  getApprovedSupersalerProducts
);

// admin view wholesaler order

router.get(
  "/wholesaler/orders",
  verifyToken,verifyAdmin,
  adminGetWholesalerOrders
);


router.put(
  "/wholesaler/orders/approve/:orderId",
  verifyToken,
  verifyAdmin,
  adminApproveOrder
);

router.put(
  "/wholesaler/orders/reject/:orderId",
  verifyToken,
  verifyAdmin,
  adminRejectOrder
)

export default router;
