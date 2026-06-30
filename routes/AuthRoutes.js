import express from "express";
import {
  loginUser,
  logoutUser,
  registerConsumer,
  registerUser,
  resetPasswordWithOtp,
} from "../controllers/AuthController.js";
import { sendOtpCode, verifyOtpCode } from "../controllers/otpController.js";

const router = express.Router();

// Routes
router.post("/register", registerUser);
router.post("/register/consumer", registerConsumer);
router.post("/otp/send", sendOtpCode);
router.post("/otp/verify", verifyOtpCode);
router.post("/login", loginUser);
router.post("/reset-password", resetPasswordWithOtp);
router.post("/logout", logoutUser);

export default router;
