import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { addToCart, deleteFromCart, getCart, updateQuantityInCart } from '../controllers/cartController.js';

const router = express.Router();

router.post('/add', verifyToken, addToCart);
router.get('/', verifyToken, getCart);
router.delete('/remove/:productId', verifyToken, deleteFromCart);
router.put('/update', verifyToken, updateQuantityInCart);

export default router;
