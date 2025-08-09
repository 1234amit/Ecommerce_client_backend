import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },

    method: {
      type: String,
      enum: ['cash_on_delivery', 'bkash', 'nagad', 'card'],
      required: true,
      default: 'cash_on_delivery',
      index: true,
    },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'BDT' },

    status: {
      type: String,
      enum: ['pending', 'authorized', 'paid', 'failed', 'refunded', 'cancelled'],
      required: true,
      default: 'pending',
      index: true,
    },

    // For online gateways (optional)
    gatewayTransactionId: { type: String, default: null },
    gatewayPayload: { type: Object, default: {} },

    // Free-form notes
    notes: { type: String, trim: true, maxlength: 500 },

    // Soft delete
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// indexes
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ userId: 1, orderId: 1 });

// paymentId generator
PaymentSchema.pre('validate', function (next) {
  if (!this.paymentId) {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    this.paymentId = `PAY-${ts}-${rnd}`;
  }
  next();
});


const Payment = mongoose.model("Payment", PaymentSchema);
export default Payment;