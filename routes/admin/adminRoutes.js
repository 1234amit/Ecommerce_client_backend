import express from "express";
import {
  verifyAdmin,
  verifyToken,
} from "../../middleware/admin/verifyAdmin.js";
import {
  changeAdminPassword,
  getAdminProfile,
  updateAdminProfile,
  updateAdminProfileImage,
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
  getAllProducts,
  getProductById,
  deleteProductById,
} from "../../controllers/admin/adminController.js";
import multer from "multer";
import path from 'path';

const router = express.Router();

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
    req.fileValidationError = 'Only image files are allowed!';
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Get Admin Profile
router.get("/profile", verifyToken, verifyAdmin, getAdminProfile);

// Update Admin Profile (with optional image upload)
router.put("/profile", verifyToken, verifyAdmin, upload.single('image'), updateAdminProfile);

// Update Admin Profile Image Only
router.put("/profile-image", verifyToken, verifyAdmin, upload.single('image'), updateAdminProfileImage);

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

// Get all products (Admin Only)
router.get("/all-products", verifyToken, verifyAdmin, getAllProducts);

// Get single product by ID (Admin Only)
router.get("/all-products/:id", verifyToken, verifyAdmin, getProductById);

// Delete product by ID (Admin Only)
router.delete("/all-products/:id", verifyToken, verifyAdmin, deleteProductById);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + error.message });
  }
  
  if (req.fileValidationError) {
    return res.status(400).json({ message: req.fileValidationError });
  }
  
  next(error);
});

export default router;
