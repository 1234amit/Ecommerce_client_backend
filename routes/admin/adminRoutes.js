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
  getAllConsumers,
  getConsumerById,
  deleteConsumerById,
  searchConsumer,
  getAllSuperSalers,
  getSuperSalerById,
  searchSuperSaler,
  deleteSuperSalerById,
  getPendingSuperSalers,
  approveSuperSaler,
  getAllWholesalers,
  getWholesalerById,
  searchWholesaler,
  deleteWholesalerById,
  getPendingWholesalers,
  approveWholesaler,
  getAllProducers,
  getProducerById,
  deleteProducerById,
  searchProducer,
  getPendingProducers,
  approveProducer,
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

// ✅ Get Consumers (Admin can see all, Consumers see themselves)
router.get("/all-consumer/", verifyToken, verifyAdmin, getAllConsumers);

// ✅ Get Single Consumer by ID (Admin Only)
router.get("/all-consumer/:id", verifyToken, verifyAdmin, getConsumerById);

// ✅ Delete Consumer by ID (Admin Only)
router.delete(
  "/all-consumer/:id",
  verifyToken,
  verifyAdmin,
  deleteConsumerById
);
//search consumer by admin
router.get("/search", verifyToken, verifyAdmin, searchConsumer);

// pending superseller by admin
router.get(
  "/all-supersaler/pending",
  verifyToken,
  verifyAdmin,
  getPendingSuperSalers
);

// ✅ Get all SuperSalers (Admin Only)
router.get("/all-supersaler", verifyToken, verifyAdmin, getAllSuperSalers);

// ✅ Search for SuperSalers (Admin Only)
router.get(
  "/all-supersaler/search",
  verifyToken,
  verifyAdmin,
  searchSuperSaler
);

// ✅ Get a single SuperSaler by ID (Admin Only)
router.get("/all-supersaler/:id", verifyToken, verifyAdmin, getSuperSalerById);

// ✅ Delete a SuperSaler by ID (Admin Only)
router.delete(
  "/all-supersaler/:id",
  verifyToken,
  verifyAdmin,
  deleteSuperSalerById
);

router.put(
  "/all-supersaler/approve/:id",
  verifyToken,
  verifyAdmin,
  approveSuperSaler
);

router.get("/all-wholesalers", verifyToken, verifyAdmin, getAllWholesalers);
router.get(
  "/all-wholesalers/search",
  verifyToken,
  verifyAdmin,
  searchWholesaler
);
router.get("/all-wholesalers/:id", verifyToken, verifyAdmin, getWholesalerById);
router.delete(
  "/all-wholesalers/:id",
  verifyToken,
  verifyAdmin,
  deleteWholesalerById
);

router.get(
  "/pending-wholesalers",
  verifyToken,
  verifyAdmin,
  getPendingWholesalers
);

router.put(
  "/approve-wholesaler/:id",
  verifyToken,
  verifyAdmin,
  approveWholesaler
);

router.get("/all-producer", verifyToken, verifyAdmin, getAllProducers);
router.get("/all-producer/search", verifyToken, verifyAdmin, searchProducer);
router.delete(
  "/all-producer/:id",
  verifyToken,
  verifyAdmin,
  deleteProducerById
);
router.get("/all-producer/:id", verifyToken, verifyAdmin, getProducerById);

router.get("/pending-producers", verifyToken, verifyAdmin, getPendingProducers);
router.put("/approve-producer/:id", verifyToken, verifyAdmin, approveProducer);

export default router;
