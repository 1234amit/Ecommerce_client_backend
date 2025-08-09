// routes/PaymentRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import PaymentController from '../controllers/PaymentController.js';

const router = express.Router();

router.post('/initiate-cod', verifyToken, PaymentController.initiateCOD);
router.get('/', verifyToken, PaymentController.listMyPayments);
router.get('/:paymentId', verifyToken, PaymentController.getPayment);
router.put('/:paymentId/status', verifyToken, PaymentController.updateStatus);

export default router;