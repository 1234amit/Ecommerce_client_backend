import express from "express";
import {
  changePassword,
  getOwnProfile,
  updateOwnProfile,
} from "../../controllers/consumer/consumerController.js";
import { verifyToken } from "../../middleware/consumer/verifyToken.js";

const router = express.Router();

// Get User Profile (Logged-in User)
router.get("/profile", verifyToken, getOwnProfile);
// Update User Profile (Logged-in User)
router.put("/profile", verifyToken, updateOwnProfile);
// change password for consumer
router.put("/change-password", verifyToken, changePassword);

export default router;
