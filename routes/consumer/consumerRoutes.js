import express from "express";
import {
  changePassword,
  getOwnProfile,
  updateOwnProfile,
  updateConsumerProfileImage,
  viewAllProducts,
  viewSingleProduct,
  getAllCategoriesForConsumer,

} from "../../controllers/consumer/consumerController.js";
import { verifyToken } from "../../middleware/consumer/verifyToken.js";
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

// Get User Profile (Logged-in User)
router.get("/profile", verifyToken, getOwnProfile);

// Update User Profile (with optional image upload)
router.put("/profile", verifyToken, upload.single('image'), updateOwnProfile);

// Update Consumer Profile Image Only
router.put("/profile-image", verifyToken, upload.single('image'), updateConsumerProfileImage);

// change password for consumer
router.put("/change-password", verifyToken, changePassword);

// view all category
router.get("/view-all-category", verifyToken, getAllCategoriesForConsumer);

// View all products for consumer
router.get("/products", verifyToken, viewAllProducts);

// View single product by ID for consumer
router.get("/products/:productId", verifyToken, viewSingleProduct);

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
