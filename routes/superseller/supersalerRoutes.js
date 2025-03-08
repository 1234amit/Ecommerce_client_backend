import express from "express";
import { verifySuperSeller } from "../../middleware/superseller/verifySuperSeller.js";
import { verifyToken } from "../../middleware/verifyToken.js";
import {
  changeSupersalerPassword,
  getSupersalerProfile,
  updateSupersalerProfile,
} from "../../controllers/superseller/superSellerController.js";

const router = express.Router();

// Get SuperSeller Profile
router.get("/profile", verifyToken, verifySuperSeller, getSupersalerProfile);

// Update SuperSeller Profile
router.put("/profile", verifyToken, verifySuperSeller, updateSupersalerProfile);

// Change SuperSeller Password
router.put(
  "/change-password",
  verifyToken,
  verifySuperSeller,
  changeSupersalerPassword
);

export default router;
