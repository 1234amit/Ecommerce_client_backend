import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productImage: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  additionalInfo: {
    type: String,
    trim: true
  }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash_on_delivery', 'bkash', 'nagad', 'rocket'],
    default: 'cash_on_delivery'
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: shippingAddressSchema,
  orderNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: String,
    enum: ['customer', 'admin', 'system']
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ userId: 1, orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

// Virtual for order status display
orderSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };
  return statusMap[this.orderStatus] || this.orderStatus;
});

// Virtual for payment status display
orderSchema.virtual('paymentStatusDisplay').get(function() {
  const statusMap = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded'
  };
  return statusMap[this.paymentStatus] || this.paymentStatus;
});

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Pre-save middleware to generate order ID
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderId) {
    // Generate order ID: ORD + timestamp + random 4 digits
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderId = `ORD${timestamp}${random}`;
  }
  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Calculate subtotal
    this.subtotal = this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    // Calculate total amount
    this.totalAmount = this.subtotal + this.deliveryFee;
  }
  next();
});

// Static method to find orders by user
orderSchema.statics.findByUser = function(userId, options = {}) {
  const { status, limit = 20, skip = 0, sort = { createdAt: -1 } } = options;
  
  let query = this.find({ userId, isActive: true });
  
  if (status) {
    query = query.where('orderStatus', status);
  }
  
  return query
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('userId', 'name email phoneNumber')
    .exec();
};

// Static method to find order by order ID
orderSchema.statics.findByOrderId = function(orderId) {
  return this.findOne({ orderId, isActive: true })
    .populate('userId', 'name email phoneNumber')
    .exec();
};

// Instance method to cancel order
orderSchema.methods.cancelOrder = function(cancelledBy, reason) {
  if (this.orderStatus === 'delivered') {
    throw new Error('Cannot cancel a delivered order');
  }
  
  if (this.orderStatus === 'cancelled') {
    throw new Error('Order is already cancelled');
  }
  
  this.orderStatus = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy;
  this.cancellationReason = reason;
  
  return this.save();
};

// Instance method to update order status
orderSchema.methods.updateStatus = function(newStatus) {
  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Invalid order status');
  }
  
  this.orderStatus = newStatus;
  
  // Set delivery date when status is delivered
  if (newStatus === 'delivered') {
    this.actualDelivery = new Date();
  }
  
  return this.save();
};

// Instance method to update payment status
orderSchema.methods.updatePaymentStatus = function(newPaymentStatus) {
  const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
  
  if (!validPaymentStatuses.includes(newPaymentStatus)) {
    throw new Error('Invalid payment status');
  }
  
  this.paymentStatus = newPaymentStatus;
  return this.save();
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
};

// Static method to get recent orders
orderSchema.statics.getRecentOrders = function(userId, limit = 5) {
  return this.find({ userId, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('orderId orderStatus totalAmount createdAt totalItems')
    .exec();
};

const Order = mongoose.model('Order', orderSchema);

export default Order;