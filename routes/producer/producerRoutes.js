import express from "express";
import {
  addProduct,
  changeProducerPassword,
  confirmSellingRequest,
  createCategory,
  deleteProductById,
  getAllCategories,
  getAllProducts,
  getProducerProfile,
  getProductById,
  getSellingRequestsForProducer,
  updateProducerProfile,
  updateProducerProfileImage,
  updateProductById,
} from "../../controllers/producer/producerController.js";
import { verifyToken } from "./../../middleware/verifyToken.js";
import { verifyProducer } from "../../middleware/producer/verifyProducer.js";
import notificationRoutes from './notificationRoutes.js';

const router = express.Router();

// Get Producer Profile
router.get("/profile", verifyToken, verifyProducer, getProducerProfile);

// Update Producer Profile
router.put("/profile", verifyToken, verifyProducer, updateProducerProfile);

// Update Producer Profile Image Only
router.put("/profile-image", verifyToken, verifyProducer, updateProducerProfileImage);

// Change Producer Password
router.put(
  "/change-password",
  verifyToken,
  verifyProducer,
  changeProducerPassword
);

// router.post("/createCategory", verifyToken, 
//   verifyProducer, createCategory);

router.post(
  "/createCategory",
  verifyToken,
  verifyProducer,
  createCategory
);


router.get("/get-allcategory", verifyToken,
  verifyProducer, getAllCategories);

// Add Product (accepts image and secondaryImages as text URLs)
// router.post(
//   "/add-product",
//   verifyToken,
//   verifyProducer,
//   addProduct
// );


router.post(
  "/add-product",
  verifyToken,
  verifyProducer,
  addProduct
);

// Get All Products for Producer
router.get("/products", verifyToken, verifyProducer, getAllProducts);

// Get Single Product by ID
router.get("/products/:productId", verifyToken, verifyProducer, getProductById);

// Update Product by ID
router.put(
  "/products/:productId",
  verifyToken,
  verifyProducer,
  updateProductById
);

// Delete Product by ID
router.delete(
  "/products/:productId",
  verifyToken,
  verifyProducer,
  deleteProductById
);

router.get("/selling-requests", verifyToken,verifyProducer, getSellingRequestsForProducer);

router.put("/confirm-selling/:productId", verifyToken, verifyProducer, confirmSellingRequest);

// Notification routes
router.use('/notifications', notificationRoutes);

export default router;
