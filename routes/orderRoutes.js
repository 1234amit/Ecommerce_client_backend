import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import {
  createOrder,
  getUserOrders,
  getOrderStats,
  getRecentOrders,
  getOrderDetails,
  cancelOrder,
  updateOrderStatus,
  getAllOrders
} from '../controllers/OrderController.js';

const router = express.Router();

// Customer routes
router.post('/create', verifyToken, createOrder);
router.get('/', verifyToken, getUserOrders);
router.get('/stats', verifyToken, getOrderStats);
router.get('/recent', verifyToken, getRecentOrders);
router.get('/:orderId', verifyToken, getOrderDetails);
router.put('/:orderId/cancel', verifyToken, cancelOrder);

export default router;
