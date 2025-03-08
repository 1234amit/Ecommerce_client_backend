import express from "express";
import {
  verifyAdmin,
  verifyToken,
} from "../../middleware/admin/verifyAdmin.js";
import {
  changeAdminPassword,
  getAdminProfile,
  updateAdminProfile,
  getAllUsers,
  getUserById,
  deleteUserById,
} from "../../controllers/admin/adminController.js";

const router = express.Router();

// Get Admin Profile
router.get("/profile", verifyToken, verifyAdmin, getAdminProfile);

// Update Admin Profile
router.put("/profile", verifyToken, verifyAdmin, updateAdminProfile);

// Change Admin Password
router.put("/change-password", verifyToken, verifyAdmin, changeAdminPassword);

// Get all users (Admin Only)
router.get("/users", verifyToken, verifyAdmin, getAllUsers);

// Get a specific user by ID (Admin Only)
router.get("/users/:id", verifyToken, verifyAdmin, getUserById);

// ✅ Delete User by ID (Admin Only)
router.delete("/users/:id", verifyToken, verifyAdmin, deleteUserById);

export default router;
