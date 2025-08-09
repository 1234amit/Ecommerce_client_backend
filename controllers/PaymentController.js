// controllers/PaymentController.js
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';

class PaymentController {
  static async initiateCOD(req, res) {
    try {
      const userId = req.user.id;
      const { orderId, notes } = req.body;

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'orderId is required' });
      }

      // Accept both Mongo _id and human orderId (ORD-...)
      let order;
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findById(orderId);
      } else {
        order = await Order.findOne({ orderId });
      }

      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      const ownerId =
        (order.userId && order.userId._id && order.userId._id.toString()) ||
        (order.userId && order.userId.toString());

      if (String(ownerId) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      // Normalize method + status
      order.paymentMethod = 'cash_on_delivery';
      order.paymentStatus = 'pending';
      await order.save();

      const amount = Number(order.totalAmount || 0);
      const payment = await Payment.create({
        userId,
        orderId: order._id,
        method: 'cash_on_delivery',
        amount,
        notes,
        status: 'pending',
      });

      return res.status(201).json({
        success: true,
        message: 'COD payment initiated',
        data: { paymentId: payment.paymentId, status: payment.status, amount: payment.amount },
      });
    } catch (err) {
      console.error('initiateCOD error:', err);
      return res.status(500).json({ success: false, message: 'Failed to initiate payment', error: err.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const { status } = req.body; // 'paid' | 'cancelled' | 'failed' | 'refunded'

      if (!paymentId || !status) {
        return res.status(400).json({ success: false, message: 'paymentId and status are required' });
      }

      const payment = await Payment.findOne({ paymentId, isActive: true });
      if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

      payment.status = status;
      await payment.save();

      const order = await Order.findById(payment.orderId);
      if (order) {
        if (status === 'paid') order.paymentStatus = 'paid';
        else if (status === 'failed') order.paymentStatus = 'failed';
        else if (status === 'cancelled') order.paymentStatus = 'pending';
        await order.save();
      }

      return res.json({ success: true, message: 'Payment status updated', data: { paymentId, status } });
    } catch (err) {
      console.error('updateStatus error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update payment', error: err.message });
    }
  }

  static async getPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await Payment
        .findOne({ paymentId, isActive: true })
        .populate('orderId', 'orderId totalAmount paymentStatus orderStatus');
      if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

      if (String(payment.userId) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      return res.json({ success: true, data: payment });
    } catch (err) {
      console.error('getPayment error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch payment', error: err.message });
    }
  }

  static async listMyPayments(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page || 1, 10);
      const limit = parseInt(req.query.limit || 10, 10);
      const { status } = req.query;
      const skip = (page - 1) * limit;

      const query = { userId, isActive: true, ...(status ? { status } : {}) };
      const [items, total] = await Promise.all([
        Payment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Payment.countDocuments(query),
      ]);

      return res.json({
        success: true,
        data: items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('listMyPayments error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch payments', error: err.message });
    }
  }
}

export default PaymentController;