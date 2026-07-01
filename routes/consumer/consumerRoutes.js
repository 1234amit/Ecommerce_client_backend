import express from "express";
import {
  changePassword,
  getOwnProfile,
  updateOwnProfile,
  updateConsumerProfileImage,
  viewAllProducts,
  viewSingleProduct,
  getAllCategoriesForConsumer,
  getProductsForConsumer,

} from "../../controllers/consumer/consumerController.js";
import { verifyToken } from "../../middleware/consumer/verifyToken.js";
import { getRetailPostsForConsumer, getSingleRetailProductForConsumer } from "../../controllers/consumer/getRetailPostsForConsumer.js";

const router = express.Router();

// Get User Profile (Logged-in User)
router.get("/profile", verifyToken, getOwnProfile);

// Update User Profile
router.put("/profile", verifyToken, updateOwnProfile);

// Update Consumer Profile Image Only
router.put("/profile-image", verifyToken, updateConsumerProfileImage);

// change password for consumer
router.put("/change-password", verifyToken, changePassword);

// view all category
router.get("/view-all-category", verifyToken, getAllCategoriesForConsumer);

// View all products for consumer
router.get("/products", verifyToken, viewAllProducts);

// View single product by ID for consumer
router.get("/products/:productId", verifyToken, viewSingleProduct);

router.get("/products", verifyToken, getProductsForConsumer);

router.get("/retail-posts",  getRetailPostsForConsumer);

router.get(
  "/retail-posts/:productId",
  getSingleRetailProductForConsumer
);

export default router;
