import express from "express";
import {
  loginUser,
  logoutUser,
  registerConsumer,
  registerUser,
} from "../controllers/AuthController.js";

const router = express.Router();

// Routes
router.post("/register", registerUser);
router.post("/register/consumer", registerConsumer);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

export default router;
