import express from "express";
import {
  addProduct,
  changeProducerPassword,
  confirmSellingRequest,
  createCategory,
  deleteProductById,
  getAllCategories,
  getAllProducts,
  getProducerProfile,
  getProductById,
  getSellingRequestsForProducer,
  updateProducerProfile,
  updateProducerProfileImage,
  updateProductById,
} from "../../controllers/producer/producerController.js";
import { verifyToken } from "./../../middleware/verifyToken.js";
import { verifyProducer } from "../../middleware/producer/verifyProducer.js";
import multer from "multer";
import notificationRoutes from './notificationRoutes.js';

const router = express.Router();

// Multer setup for file upload
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|avif)$/)) {
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

// router.post("/createCategory", verifyToken, 
//   verifyProducer, createCategory);

router.post(
  "/createCategory",
  verifyToken,
  verifyProducer,
  upload.single("icon"), // <- handle file upload
  createCategory
);


router.get("/get-allcategory", verifyToken,
  verifyProducer, getAllCategories);

// Add Product (accepts image and secondaryImages as text URLs)
// router.post(
//   "/add-product",
//   verifyToken,
//   verifyProducer,
//   addProduct
// );


router.post(
  "/add-product",
  verifyToken,
  verifyProducer,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "secondaryImages", maxCount: 5 }
  ]),
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

router.get("/selling-requests", verifyToken,verifyProducer, getSellingRequestsForProducer);

router.put("/confirm-selling/:productId", verifyToken, verifyProducer, confirmSellingRequest);

// Notification routes
router.use('/notifications', notificationRoutes);

export default router;
