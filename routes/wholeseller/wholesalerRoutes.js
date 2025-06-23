import express from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { verifyWholesaler } from "../../middleware/wholeseller/verifyWholesaler.js";
import {
  changeWholesalerPassword,
  getWholesalerProfile,
  updateWholesalerProfile,
  updateWholesalerProfileImage,
} from "../../controllers/wholeseller/wholesalerController.js";
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

// Get Wholesaler Profile
router.get("/profile", verifyToken, verifyWholesaler, getWholesalerProfile);

// Update Wholesaler Profile (with optional image upload)
router.put("/profile", verifyToken, verifyWholesaler, upload.single('image'), updateWholesalerProfile);

// Update Wholesaler Profile Image Only
router.put("/profile-image", verifyToken, verifyWholesaler, upload.single('image'), updateWholesalerProfileImage);

// Change Wholesaler Password
router.put(
  "/change-password",
  verifyToken,
  verifyWholesaler,
  changeWholesalerPassword
);

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
