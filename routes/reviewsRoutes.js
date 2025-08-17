import express from "express";
import { createReview, getReviewsByUserName, getReviewsByProduct } from "../controllers/ReviewsController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
// create review
router.post("/create-review", verifyToken, createReview);

// get review
router.get("/get-review/:productId", verifyToken, getReviewsByProduct);

// get user own reviews

router.get("/user-review/:userName", verifyToken, getReviewsByUserName);

export default router; 