import express from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { verifyWholesaler } from "../../middleware/wholeseller/verifyWholesaler.js";
import {
  changeWholesalerPassword,
  getWholesalerProfile,
  updateWholesalerProfile,
} from "../../controllers/wholeseller/wholesalerController.js";

const router = express.Router();

// Get Wholesaler Profile
router.get("/profile", verifyToken, verifyWholesaler, getWholesalerProfile);

// Update Wholesaler Profile
router.put("/profile", verifyToken, verifyWholesaler, updateWholesalerProfile);

// Change Wholesaler Password
router.put(
  "/change-password",
  verifyToken,
  verifyWholesaler,
  changeWholesalerPassword
);

export default router;
