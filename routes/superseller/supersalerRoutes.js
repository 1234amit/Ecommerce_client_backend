import express from "express";
import { verifySuperSeller } from "../../middleware/superseller/verifySuperSeller.js";
import { verifyToken } from "../../middleware/verifyToken.js";
import {
  changeSupersalerPassword,
  getSupersalerProfile,
  updateSupersalerProfile,
  updateSupersalerProfileImage,
} from "../../controllers/superseller/superSellerController.js";
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

// Get SuperSeller Profile
router.get("/profile", verifyToken, verifySuperSeller, getSupersalerProfile);

// Update SuperSeller Profile (with optional image upload)
router.put("/profile", verifyToken, verifySuperSeller, upload.single('image'), updateSupersalerProfile);

// Update SuperSeller Profile Image Only
router.put("/profile-image", verifyToken, verifySuperSeller, upload.single('image'), updateSupersalerProfileImage);

// Change SuperSeller Password
router.put(
  "/change-password",
  verifyToken,
  verifySuperSeller,
  changeSupersalerPassword
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
