
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';


class OrderController {
    // Create a new order
    static async createOrder(req, res) {
        try {
            const userId = req.user.id; // From JWT token
            const {
                items,
                shippingAddress,
                paymentMethod,
                orderNotes,
                deliveryFee = 0
            } = req.body;

            // Validate required fields
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Order items are required'
                });
            }

            if (!shippingAddress) {
                return res.status(400).json({
                    success: false,
                    message: 'Shipping address is required'
                });
            }

            // Validate shipping address
            const requiredAddressFields = ['fullName', 'phoneNumber', 'address', 'city'];
            for (const field of requiredAddressFields) {
                if (!shippingAddress[field] || !shippingAddress[field].trim()) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} is required in shipping address`
                    });
                }
            }

            // Validate payment method
            const validPaymentMethods = ['cash_on_delivery', 'bkash', 'nagad', 'rocket'];
            if (!validPaymentMethods.includes(paymentMethod)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment method'
                });
            }

            // Process order items and validate products
            const processedItems = [];
            let subtotal = 0;

            for (const item of items) {
                // Validate item structure
                if (!item.productId || !item.quantity || item.quantity < 1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid item data: productId and quantity are required'
                    });
                }

                // Get product details
                // const product = await Product.findById(item.productId);

                const productId = mongoose.Types.ObjectId.isValid(item.productId)
                    ? new mongoose.Types.ObjectId(item.productId)
                    : null;

                if (!productId) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid productId: ${item.productId}`
                    });
                }

                const product = await Product.findById(productId);

                if (!product) {
                    return res.status(400).json({
                        success: false,
                        message: `Product with ID ${item.productId} not found`
                    });
                }

                // Check if product is available
                if (!product.isActive || product.stock < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Product ${product.name} is not available in requested quantity`
                    });
                }

                const itemTotal = product.price * item.quantity;
                subtotal += itemTotal;

                processedItems.push({
                    productId: product._id,
                    productName: product.name,
                    productImage: product.images[0] || '',
                    price: product.price,
                    quantity: item.quantity,
                    totalPrice: itemTotal
                });
            }

            // Calculate total amount
            const totalAmount = subtotal + deliveryFee;

            // Create the order
            const orderData = {
                userId,
                items: processedItems,
                subtotal,
                deliveryFee,
                totalAmount,
                paymentMethod,
                shippingAddress,
                orderNotes: orderNotes || ''
            };

            const order = new Order(orderData);
            await order.save();

            // Clear user's cart after successful order creation
            try {
                await Cart.deleteMany({ userId });
            } catch (cartError) {
                console.error('Error clearing cart:', cartError);
                // Don't fail the order creation if cart clearing fails
            }

            // Update product stock (optional - you might want to do this when order is confirmed)
            // for (const item of processedItems) {
            //   await Product.findByIdAndUpdate(item.productId, {
            //     $inc: { stock: -item.quantity }
            //   });
            // }

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: {
                    orderId: order.orderId,
                    totalAmount: order.totalAmount,
                    orderStatus: order.orderStatus,
                    paymentStatus: order.paymentStatus,
                    estimatedDelivery: order.estimatedDelivery
                }
            });

        } catch (error) {
            console.error('Create order error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create order',
                error: error.message
            });
        }
    }

    // Get user's orders
    static async getUserOrders(req, res) {
        try {
            const userId = req.user.id;
            const { status, page = 1, limit = 10 } = req.query;

            const skip = (page - 1) * limit;
            const options = {
                status,
                limit: parseInt(limit),
                skip: parseInt(skip)
            };

            const orders = await Order.findByUser(userId, options);
            const totalOrders = await Order.countDocuments({ userId, isActive: true });

            // Format orders for response
            const formattedOrders = orders.map(order => ({
                orderId: order.orderId,
                orderStatus: order.orderStatus,
                statusDisplay: order.statusDisplay,
                paymentStatus: order.paymentStatus,
                paymentStatusDisplay: order.paymentStatusDisplay,
                totalAmount: order.totalAmount,
                totalItems: order.totalItems,
                createdAt: order.createdAt,
                estimatedDelivery: order.estimatedDelivery,
                items: order.items.map(item => ({
                    productName: item.productName,
                    productImage: item.productImage,
                    price: item.price,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice
                }))
            }));

            res.json({
                success: true,
                data: {
                    orders: formattedOrders,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalOrders / limit),
                        totalOrders,
                        hasNextPage: page * limit < totalOrders,
                        hasPrevPage: page > 1
                    }
                }
            });

        } catch (error) {
            console.error('Get user orders error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
                error: error.message
            });
        }
    }

    // Get order details by order ID
    static async getOrderDetails(req, res) {
        try {
            const userId = req.user.id;
            const { orderId } = req.params;

            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    message: 'Order ID is required'
                });
            }

            const order = await Order.findByOrderId(orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Check if the order belongs to the authenticated user
            if (order.userId.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This order does not belong to you.'
                });
            }

            // Format order details
            const orderDetails = {
                orderId: order.orderId,
                orderStatus: order.orderStatus,
                statusDisplay: order.statusDisplay,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                paymentStatusDisplay: order.paymentStatusDisplay,
                subtotal: order.subtotal,
                deliveryFee: order.deliveryFee,
                totalAmount: order.totalAmount,
                totalItems: order.totalItems,
                shippingAddress: order.shippingAddress,
                orderNotes: order.orderNotes,
                estimatedDelivery: order.estimatedDelivery,
                actualDelivery: order.actualDelivery,
                cancelledAt: order.cancelledAt,
                cancelledBy: order.cancelledBy,
                cancellationReason: order.cancellationReason,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                items: order.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    productImage: item.productImage,
                    price: item.price,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice
                }))
            };

            res.json({
                success: true,
                data: orderDetails
            });

        } catch (error) {
            console.error('Get order details error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch order details',
                error: error.message
            });
        }
    }

    // Update order status (admin only)
    static async updateOrderStatus(req, res) {
        try {
            const { orderId } = req.params;
            const { status } = req.body;

            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    message: 'Order ID is required'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status is required'
                });
            }

            const order = await Order.findByOrderId(orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Update order status
            await order.updateStatus(status);

            res.json({
                success: true,
                message: 'Order status updated successfully',
                data: {
                    orderId: order.orderId,
                    orderStatus: order.orderStatus,
                    statusDisplay: order.statusDisplay
                }
            });

        } catch (error) {
            console.error('Update order status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update order status',
                error: error.message
            });
        }
    }

    // Cancel order
    static async cancelOrder(req, res) {
        try {
            const userId = req.user.id;
            const { orderId } = req.params;
            const { reason } = req.body;

            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    message: 'Order ID is required'
                });
            }

            const order = await Order.findByOrderId(orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Check if the order belongs to the authenticated user
            if (order.userId.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This order does not belong to you.'
                });
            }

            // Cancel the order
            await order.cancelOrder('customer', reason);

            res.json({
                success: true,
                message: 'Order cancelled successfully',
                data: {
                    orderId: order.orderId,
                    orderStatus: order.orderStatus,
                    cancelledAt: order.cancelledAt,
                    cancellationReason: order.cancellationReason
                }
            });

        } catch (error) {
            console.error('Cancel order error:', error);

            if (error.message.includes('Cannot cancel') || error.message.includes('already cancelled')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to cancel order',
                error: error.message
            });
        }
    }

    // Get order statistics
    static async getOrderStats(req, res) {
        try {
            const userId = req.user.id;

            const stats = await Order.getOrderStats(userId);

            // Format stats
            const formattedStats = {
                total: 0,
                totalAmount: 0,
                byStatus: {}
            };

            stats.forEach(stat => {
                formattedStats.total += stat.count;
                formattedStats.totalAmount += stat.totalAmount;
                formattedStats.byStatus[stat._id] = {
                    count: stat.count,
                    totalAmount: stat.totalAmount
                };
            });

            res.json({
                success: true,
                data: formattedStats
            });

        } catch (error) {
            console.error('Get order stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch order statistics',
                error: error.message
            });
        }
    }

    // Get recent orders
    static async getRecentOrders(req, res) {
        try {
            const userId = req.user.id;
            const { limit = 5 } = req.query;

            const orders = await Order.getRecentOrders(userId, parseInt(limit));

            const formattedOrders = orders.map(order => ({
                orderId: order.orderId,
                orderStatus: order.orderStatus,
                totalAmount: order.totalAmount,
                totalItems: order.totalItems,
                createdAt: order.createdAt
            }));

            res.json({
                success: true,
                data: formattedOrders
            });

        } catch (error) {
            console.error('Get recent orders error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch recent orders',
                error: error.message
            });
        }
    }

    // Admin: Get all orders (with filtering and pagination)
    static async getAllOrders(req, res) {
        try {
            const {
                status,
                paymentStatus,
                page = 1,
                limit = 20,
                search,
                startDate,
                endDate
            } = req.query;

            const skip = (page - 1) * limit;
            let query = { isActive: true };

            // Apply filters
            if (status) {
                query.orderStatus = status;
            }

            if (paymentStatus) {
                query.paymentStatus = paymentStatus;
            }

            if (search) {
                query.$or = [
                    { orderId: { $regex: search, $options: 'i' } },
                    { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
                    { 'shippingAddress.phoneNumber': { $regex: search, $options: 'i' } }
                ];
            }

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) {
                    query.createdAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    query.createdAt.$lte = new Date(endDate);
                }
            }

            const orders = await Order.find(query)
                .populate('userId', 'name email phoneNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const totalOrders = await Order.countDocuments(query);

            const formattedOrders = orders.map(order => ({
                orderId: order.orderId,
                userId: order.userId,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus,
                totalAmount: order.totalAmount,
                totalItems: order.totalItems,
                shippingAddress: order.shippingAddress,
                createdAt: order.createdAt,
                paymentMethod: order.paymentMethod
            }));

            res.json({
                success: true,
                data: {
                    orders: formattedOrders,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalOrders / limit),
                        totalOrders,
                        hasNextPage: page * limit < totalOrders,
                        hasPrevPage: page > 1
                    }
                }
            });

        } catch (error) {
            console.error('Get all orders error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
                error: error.message
            });
        }
    }
}

export const {
    createOrder,
    getUserOrders,
    getOrderStats,
    getRecentOrders,
    getOrderDetails,
    cancelOrder,
    updateOrderStatus,
    getAllOrders
} = OrderController;
