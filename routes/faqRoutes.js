import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { createFAQ, getAllFAQs } from '../controllers/faqController.js';

const router = express.Router();

router.post('/create', verifyToken, createFAQ);
router.get('/', verifyToken, getAllFAQs);

export default router;