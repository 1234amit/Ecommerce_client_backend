import express from "express";
import {
  addProduct,
  changeProducerPassword,
  createCategory,
  deleteProductById,
  getAllCategories,
  getAllProducts,
  getProducerProfile,
  getProductById,
  updateProducerProfile,
  updateProducerProfileImage,
  updateProductById,
} from "../../controllers/producer/producerController.js";
import { verifyToken } from "./../../middleware/verifyToken.js";
import { verifyProducer } from "../../middleware/producer/verifyProducer.js";
import multer from "multer";
import notificationRoutes from './notificationRoutes.js';
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

// Get Producer Profile
router.get("/profile", verifyToken, verifyProducer, getProducerProfile);

// Update Producer Profile (with optional image upload)
router.put("/profile", verifyToken, verifyProducer, upload.single('image'), updateProducerProfile);

// Update Producer Profile Image Only
router.put("/profile-image", verifyToken, verifyProducer, upload.single('image'), updateProducerProfileImage);

// Change Producer Password
router.put(
  "/change-password",
  verifyToken,
  verifyProducer,
  changeProducerPassword
);

router.post("/createCategory", verifyToken,
  verifyProducer, createCategory);
router.get("/get-allcategory", verifyToken,
  verifyProducer, getAllCategories);

// Add Product (accepts image and secondaryImages as text URLs)
router.post(
  "/add-product",
  verifyToken,
  verifyProducer,
  addProduct
);

// Get All Products for Producer
router.get("/products", verifyToken, verifyProducer, getAllProducts);

// Get Single Product by ID
router.get("/products/:productId", verifyToken, verifyProducer, getProductById);

// Update Product by ID
router.put(
  "/products/:productId",
  verifyToken,
  verifyProducer,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'secondaryImages', maxCount: 5 }
  ]),
  updateProductById
);

// Delete Product by ID
router.delete(
  "/products/:productId",
  verifyToken,
  verifyProducer,
  deleteProductById
);

// Notification routes
router.use('/notifications', notificationRoutes);

export default router;
