import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile, updateProfileImage } from "../controllers/profileController.js";

const router = express.Router();

// Get profile
router.get("/", protect, getProfile);

// Update profile
router.put("/", protect, updateProfile);

// Update profile image only
router.put("/image", protect, updateProfileImage);

export default router; 
