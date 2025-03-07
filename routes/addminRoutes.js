import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyAdmin } from "../middleware/admin/verifyAdmin.js";
import {
  getAllUsers,
  getUserById,
} from "../controllers/admin/adminController.js";

const router = express.Router();

// Get all users (Admin Only)
router.get("/users", verifyToken, verifyAdmin, getAllUsers);

// Get a specific user by ID (Admin Only)
router.get("/users/:id", verifyToken, verifyAdmin, getUserById);

export default router;
