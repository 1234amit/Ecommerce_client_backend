import express from "express";
import {
  addProduct,
  changeProducerPassword,
  getAllProducts,
  getProducerProfile,
  getProductById,
  updateProducerProfile,
  updateProductById,
} from "../../controllers/producer/producerController.js";
import { verifyToken } from "./../../middleware/verifyToken.js";
import { verifyProducer } from "../../middleware/producer/verifyProducer.js";
import multer from "multer";

const router = express.Router();

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Folder where images will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Get Producer Profile
router.get("/profile", verifyToken, verifyProducer, getProducerProfile);

// Update Producer Profile
router.put("/profile", verifyToken, verifyProducer, updateProducerProfile);

// Change Producer Password
router.put(
  "/change-password",
  verifyToken,
  verifyProducer,
  changeProducerPassword
);

router.post(
  "/add-product",
  verifyToken,
  verifyProducer,
  upload.fields([
    { name: 'image', maxCount: 1 }, // Main image (required)
    { name: 'secondaryImages', maxCount: 5 } // Secondary images (optional, max 5)
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
    { name: 'image', maxCount: 1 }, // Main image (optional for update)
    { name: 'secondaryImages', maxCount: 5 } // Secondary images (optional for update)
  ]),
  updateProductById
);

export default router;
