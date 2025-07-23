import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure one user can only add a product once to wishlist
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Virtual for formatted date
wishlistSchema.virtual('formattedDate').get(function() {
  return this.addedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

export default mongoose.model('Wishlist', wishlistSchema);