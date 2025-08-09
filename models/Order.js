// models/Order.js
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productImage: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  postalCode: { type: String, trim: true },
  additionalInfo: { type: String, trim: true },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash_on_delivery', 'bkash', 'nagad', 'rocket'],
      default: 'cash_on_delivery',
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    shippingAddress: shippingAddressSchema,
    orderNotes: { type: String, trim: true, maxlength: 500 },
    estimatedDelivery: { type: Date },
    actualDelivery: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ['customer', 'admin', 'system'] },
    cancellationReason: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ userId: 1, orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

// Virtuals
orderSchema.virtual('statusDisplay').get(function () {
  const m = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return m[this.orderStatus] || this.orderStatus;
});

orderSchema.virtual('paymentStatusDisplay').get(function () {
  const m = { pending: 'Pending', paid: 'Paid', failed: 'Failed', refunded: 'Refunded' };
  return m[this.paymentStatus] || this.paymentStatus;
});

// SAFE totalItems (works even if items not selected)
orderSchema.virtual('totalItems').get(function () {
  const items = Array.isArray(this.items) ? this.items : [];
  return items.reduce((sum, it) => sum + Number(it?.quantity || 0), 0);
});

// Helpers
function generateOrderId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const rnd = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
  return `ORD-${ymd}-${rnd}`;
}

// Auto-generate orderId if missing
orderSchema.pre('validate', function (next) {
  if (this.isNew && !this.orderId) this.orderId = generateOrderId();
  next();
});

// Auto-calc totals
orderSchema.pre('save', function (next) {
  const items = Array.isArray(this.items) ? this.items : [];
  this.subtotal = items.reduce((t, i) => t + Number(i.price || 0) * Number(i.quantity || 0), 0);
  this.totalAmount = Number(this.subtotal || 0) + Number(this.deliveryFee || 0);
  next();
});

// Statics
orderSchema.statics.findByUser = function (userId, options = {}) {
  const { status, limit = 20, skip = 0, sort = { createdAt: -1 } } = options;
  let q = this.find({ userId, isActive: true });
  if (status) q = q.where('orderStatus', status);
  return q.sort(sort).skip(skip).limit(limit).populate('userId', 'name email phoneNumber').exec();
};

orderSchema.statics.findByOrderId = function (orderId) {
  return this.findOne({ orderId, isActive: true }).populate('userId', 'name email phoneNumber').exec();
};

orderSchema.statics.getOrderStats = function (userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    { $group: { _id: '$orderStatus', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
  ]);
};

// Recent orders via aggregation (no dependency on virtuals)
orderSchema.statics.getRecentOrders = function (userId, limit = 5) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    { $sort: { createdAt: -1 } },
    { $limit: Number(limit) },
    {
      $project: {
        orderId: 1,
        orderStatus: 1,
        totalAmount: 1,
        createdAt: 1,
        totalItems: { $sum: '$items.quantity' },
      },
    },
  ]);
};

// Methods
orderSchema.methods.cancelOrder = function (cancelledBy, reason) {
  if (this.orderStatus === 'delivered') throw new Error('Cannot cancel a delivered order');
  if (this.orderStatus === 'cancelled') throw new Error('Order is already cancelled');
  this.orderStatus = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy;
  this.cancellationReason = reason;
  return this.save();
};

orderSchema.methods.updateStatus = function (newStatus) {
  const valid = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(newStatus)) throw new Error('Invalid order status');
  this.orderStatus = newStatus;
  if (newStatus === 'delivered') this.actualDelivery = new Date();
  return this.save();
};

orderSchema.methods.updatePaymentStatus = function (newStatus) {
  const valid = ['pending', 'paid', 'failed', 'refunded'];
  if (!valid.includes(newStatus)) throw new Error('Invalid payment status');
  this.paymentStatus = newStatus;
  return this.save();
};

const Order = mongoose.model('Order', orderSchema);
export default Order;