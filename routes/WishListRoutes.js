import express from 'express';
import wishlistController from '../controllers/wishlistController.js';
import { verifyToken } from '../middleware/verifyToken.js';
const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Add product to wishlist
router.post('/add', wishlistController.addToWishlist);

// Get user's wishlist
router.get('/', wishlistController.getWishlist);

// Remove product from wishlist
router.delete('/:wishlistId', wishlistController.removeFromWishlist);

// Check if product is in wishlist
router.get('/check/:productId', wishlistController.checkWishlistStatus);

// Clear entire wishlist
router.delete('/', wishlistController.clearWishlist);

export default router;
