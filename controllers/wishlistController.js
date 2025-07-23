import Product from "../models/Product.js";
import Wishlist from "../models/Wishlist.js";
import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * Wishlist Controller
 * 
 * This controller handles all wishlist operations for authenticated users.
 * 
 * Authentication Flow:
 * 1. All routes are protected by verifyToken middleware
 * 2. User must provide a valid JWT token in Authorization header: "Bearer <token>"
 * 3. Token is verified and user information is extracted
 * 4. User ID is available in req.user.id for all operations
 * 5. All wishlist operations are user-specific (users can only access their own wishlist)
 * 
 * API Usage:
 * - Add to wishlist: POST /api/v1/wishlist/add (Body: { productId })
 * - Get wishlist: GET /api/v1/wishlist
 * - Remove from wishlist: DELETE /api/v1/wishlist/:wishlistId
 * - Check wishlist status: GET /api/v1/wishlist/check/:productId
 * - Clear wishlist: DELETE /api/v1/wishlist
 */

const wishlistController = {
  // Add product to wishlist
  async addToWishlist(req, res) {
    try {
      const { productId } = req.body;
      const userId = req.user.id;

      // Validate user authentication
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Validate input
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      // Validate productId format
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check if already in wishlist
      const existingWishlist = await Wishlist.findOne({ userId, productId });
      if (existingWishlist) {
        return res.status(400).json({
          success: false,
          message: 'Product already in wishlist'
        });
      }

      // Add to wishlist
      const wishlistItem = new Wishlist({
        userId,
        productId
      });

      await wishlistItem.save();

      res.status(201).json({
        success: true,
        message: 'Product added to wishlist successfully',
        data: {
          wishlistId: wishlistItem._id,
          productId: productId,
          productName: product.productName,
          addedAt: wishlistItem.addedAt
        }
      });

    } catch (error) {
      console.error('Error adding to wishlist:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Get user's wishlist
  async getWishlist(req, res) {
    try {
      const userId = req.user.id;
      const { category, page = 1, limit = 20 } = req.query;

      // Validate user authentication
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Build query
      let query = { userId };
      
      // Add category filter if provided
      if (category && category !== 'all') {
        query['product.category'] = category;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get wishlist items with product details
      const wishlistItems = await Wishlist.find(query)
        .populate({
          path: 'productId',
          select: 'productName description price image category rating discount producer'
        })
        .sort({ addedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const totalItems = await Wishlist.countDocuments(query);

      // Get category counts
      const categoryCounts = await Wishlist.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$product.category',
            count: { $sum: 1 }
          }
        }
      ]);

      // Format response
      const formattedItems = wishlistItems.map(item => ({
        id: item._id,
        productId: item.productId._id,
        productName: item.productId.productName,
        description: item.productId.description,
        price: item.productId.price,
        image: item.productId.image,
        category: item.productId.category,
        rating: item.productId.rating,
        discount: item.productId.discount,
        producer: item.productId.producer,
        addedAt: item.addedAt,
        formattedDate: item.formattedDate
      }));

      res.json({
        success: true,
        message: 'Wishlist fetched successfully',
        data: {
          items: formattedItems,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalItems / parseInt(limit)),
            totalItems,
            hasNextPage: skip + wishlistItems.length < totalItems,
            hasPrevPage: parseInt(page) > 1
          },
          categoryCounts: categoryCounts.map(cat => ({
            category: cat._id,
            count: cat.count
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching wishlist:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Remove product from wishlist
  async removeFromWishlist(req, res) {
    try {
      const { wishlistId } = req.params;
      const userId = req.user.id;

      // Validate user authentication
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Validate wishlistId format
      if (!mongoose.Types.ObjectId.isValid(wishlistId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wishlist ID format'
        });
      }

      // Find and delete wishlist item (only if it belongs to the user)
      const wishlistItem = await Wishlist.findOneAndDelete({
        _id: wishlistId,
        userId
      });

      if (!wishlistItem) {
        return res.status(404).json({
          success: false,
          message: 'Wishlist item not found or not authorized to delete'
        });
      }

      res.json({
        success: true,
        message: 'Product removed from wishlist successfully'
      });

    } catch (error) {
      console.error('Error removing from wishlist:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Check if product is in wishlist
  async checkWishlistStatus(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.id;

      // Validate user authentication
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Validate productId format
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      const wishlistItem = await Wishlist.findOne({ userId, productId });

      res.json({
        success: true,
        data: {
          isWishlisted: !!wishlistItem,
          wishlistId: wishlistItem?._id
        }
      });

    } catch (error) {
      console.error('Error checking wishlist status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Clear entire wishlist
  async clearWishlist(req, res) {
    try {
      const userId = req.user.id;

      // Validate user authentication
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await Wishlist.deleteMany({ userId });

      res.json({
        success: true,
        message: 'Wishlist cleared successfully',
        data: {
          deletedCount: result.deletedCount
        }
      });

    } catch (error) {
      console.error('Error clearing wishlist:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
};

export default wishlistController;