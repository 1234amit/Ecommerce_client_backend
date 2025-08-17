import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

class OrderController {
    // Create a new order
    // Create a new order (tailored to your Product schema)
    // Create a new order (fits your Product schema exactly)
    static async createOrder(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const {
                items,
                shippingAddress,
                paymentMethod,
                orderNotes,
                deliveryFee = 0,
            } = req.body || {};

            // Basic validation
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, message: 'Order items are required' });
            }
            if (!shippingAddress) {
                return res.status(400).json({ success: false, message: 'Shipping address is required' });
            }
            const requiredAddressFields = ['fullName', 'phoneNumber', 'address', 'city'];
            for (const f of requiredAddressFields) {
                const v = shippingAddress[f];
                if (v == null || (typeof v === 'string' && v.trim() === '')) {
                    return res.status(400).json({ success: false, message: `${f} is required in shipping address` });
                }
            }
            const validPaymentMethods = ['cash_on_delivery', 'bkash', 'nagad', 'rocket'];
            if (!validPaymentMethods.includes(paymentMethod)) {
                return res.status(400).json({ success: false, message: 'Invalid payment method' });
            }

            // Helpers
            const parseNumeric = (v) => {
                if (v === null || v === undefined) return undefined;
                const cleaned = String(v).replace(/[^\d.-]/g, '');   // supports "90,000", " 120000 "
                if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return undefined;
                const n = Number(cleaned);
                return Number.isFinite(n) ? n : undefined;
            };

            // Generate a unique orderId (since your schema requires it)
            const generateOrderId = async () => {
                const pad = (n) => String(n).padStart(2, '0');
                const d = new Date();
                const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
                let id;
                do {
                    const rnd = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
                    id = `ORD-${ymd}-${rnd}`;
                } while (await Order.exists({ orderId: id }));
                return id;
            };

            const processedItems = [];
            let subtotal = 0;

            // Process items
            for (const item of items) {
                const { productId, quantity } = item || {};

                if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
                    return res.status(400).json({ success: false, message: `Invalid productId: ${productId}` });
                }
                const qty = Math.max(1, parseInt(quantity, 10));
                if (!qty) {
                    return res.status(400).json({ success: false, message: 'Invalid item quantity' });
                }

                // Fetch only fields your DB stores
                const product = await Product.findById(productId)
                    .select('productName quantity price image secondaryImages addToSellPost')
                    .lean();

                if (!product) {
                    return res.status(404).json({ success: false, message: `Product with ID ${productId} not found` });
                }

                const productName = product.productName || 'this product';

                // Treat addToSellPost === "no" as inactive; everything else = active
                const isActive = String(product.addToSellPost ?? 'yes').toLowerCase() !== 'no';
                if (!isActive) {
                    return res.status(400).json({ success: false, message: `Product ${productName} is not active` });
                }

                // Parse inventory (string in DB) and unit price (string in DB)
                const available = parseNumeric(product.quantity);          // number | undefined
                const unitPriceParsed = parseNumeric(product.price);
                if (!Number.isFinite(unitPriceParsed) || unitPriceParsed < 0) {
                    return res.status(400).json({ success: false, message: `Invalid price for ${productName}` });
                }
                const unitPrice = Number(unitPriceParsed);

                // Only enforce stock if quantity is numeric in DB
                if (Number.isFinite(available)) {
                    if (available <= 0) {
                        return res.status(400).json({ success: false, message: `Product ${productName} is not available in requested quantity` });
                    }
                    if (available < qty) {
                        return res.status(400).json({ success: false, message: `Product ${productName} has only ${available} in stock` });
                    }
                }

                const productImage = Array.isArray(product.secondaryImages) && product.secondaryImages.length
                    ? product.secondaryImages[0]
                    : (product.image || '');

                const itemTotal = unitPrice * qty;
                subtotal += itemTotal;

                processedItems.push({
                    productId: product._id,   // store as ObjectId
                    productName,
                    productImage,
                    price: unitPrice,
                    quantity: qty,
                    totalPrice: itemTotal,
                });
            }

            // Totals
            const numericDeliveryFee = Number(deliveryFee) || 0;
            const totalAmount = subtotal + numericDeliveryFee;

            // Create order
            const orderId = await generateOrderId();
            const orderData = {
                orderId,
                userId,
                items: processedItems,
                subtotal,
                deliveryFee: numericDeliveryFee,
                totalAmount,
                paymentMethod,
                shippingAddress,
                orderNotes: orderNotes || '',
            };

            const order = new Order(orderData);
            await order.save();

            // Best-effort clear cart
            try { await Cart.deleteMany({ userId }); } catch (e) { console.error('Error clearing cart:', e); }

            return res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: {
                    _id: order._id,
                    orderId: order.orderId,
                    totalAmount: order.totalAmount,
                    orderStatus: order.orderStatus,
                    paymentStatus: order.paymentStatus,
                    estimatedDelivery: order.estimatedDelivery,
                },
            });
        } catch (error) {
            console.error('Create order error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create order',
                error: error.message,
            });
        }
    }

    // Get user's orders
    // inside OrderController
    static async getUserOrders(req, res) {
        try {
            // 1) Auth guard
            const userId = req?.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            // 2) Parse & sanitize query params
            const ALLOWED_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
            let { status, page = 1, limit = 10 } = req.query;

            page = parseInt(page, 10);
            limit = parseInt(limit, 10);
            if (!Number.isFinite(page) || page < 1) page = 1;
            if (!Number.isFinite(limit) || limit < 1 || limit > 100) limit = 10;

            const skip = (page - 1) * limit;

            // 3) Build criteria (ignore invalid status or "all")
            const criteria = { userId, isActive: true };
            if (status && ALLOWED_STATUSES.includes(status)) {
                criteria.orderStatus = status;
            }

            // 4) Fetch & count with SAME criteria
            const [orders, totalOrders] = await Promise.all([
                Order.find(criteria)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean({ virtuals: true }) // include virtuals: statusDisplay, paymentStatusDisplay, totalItems
                    .exec(),
                Order.countDocuments(criteria),
            ]);

            // 5) Shape response
            const formattedOrders = orders.map((order) => ({
                orderId: order.orderId,
                orderStatus: order.orderStatus,
                statusDisplay: order.statusDisplay,                   // virtual
                paymentStatus: order.paymentStatus,
                paymentStatusDisplay: order.paymentStatusDisplay,     // virtual
                totalAmount: order.totalAmount,
                totalItems: order.totalItems,                         // virtual
                createdAt: order.createdAt,
                estimatedDelivery: order.estimatedDelivery || null,
                items: (order.items || []).map((item) => ({
                    productName: item.productName,
                    productImage: item.productImage,
                    price: item.price,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice,
                })),
            }));

            return res.json({
                success: true,
                data: {
                    orders: formattedOrders,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.max(1, Math.ceil(totalOrders / limit)),
                        totalOrders,
                        hasNextPage: page * limit < totalOrders,
                        hasPrevPage: page > 1,
                    },
                },
            });
        } catch (error) {
            console.error('Get user orders error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
                error: error.message,
            });
        }
    }


    static async getOrderDetails(req, res) {
        try {
            const userId = req.user.id;
            const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;
            const { orderId } = req.params;

            if (!orderId) {
                return res.status(400).json({ success: false, message: 'Order ID is required' });
            }

            const order = await Order.findByOrderId(orderId); // returns populated userId
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Safely extract owner id whether populated or not
            const ownerId =
                (order.userId && order.userId._id && order.userId._id.toString()) ||
                (order.userId && order.userId.id) || // mongoose virtual 'id' string
                (order.userId && order.userId.toString());

            if (!isAdmin && String(ownerId) !== String(userId)) {
                return res.status(403).json({ success: false, message: 'Access denied. This order does not belong to you.' });
            }

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
                items: order.items.map(i => ({
                    productId: i.productId,
                    productName: i.productName,
                    productImage: i.productImage,
                    price: i.price,
                    quantity: i.quantity,
                    totalPrice: i.totalPrice,
                })),
            };

            return res.json({ success: true, data: orderDetails });
        } catch (error) {
            console.error('Get order details error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch order details', error: error.message });
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
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

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
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            if (order.userId.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This order does not belong to you.'
                });
            }

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
                return res.status(400).json({ success: false, message: error.message });
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

            const formattedStats = {
                total: 0,
                totalAmount: 0,
                byStatus: {}
            };

            stats.forEach((stat) => {
                formattedStats.total += stat.count;
                formattedStats.totalAmount += stat.totalAmount;
                formattedStats.byStatus[stat._id] = {
                    count: stat.count,
                    totalAmount: stat.totalAmount
                };
            });

            res.json({ success: true, data: formattedStats });
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
    // static async getRecentOrders(req, res) {
    //     try {
    //         const userId = req.user.id;
    //         const { limit = 5 } = req.query;

    //         const orders = await Order.getRecentOrders(userId, parseInt(limit));

    //         const formattedOrders = orders.map((order) => ({
    //             orderId: order.orderId,
    //             orderStatus: order.orderStatus,
    //             totalAmount: order.totalAmount,
    //             totalItems: order.totalItems,
    //             createdAt: order.createdAt
    //         }));

    //         res.json({ success: true, data: formattedOrders });
    //     } catch (error) {
    //         console.error('Get recent orders error:', error);
    //         res.status(500).json({
    //             success: false,
    //             message: 'Failed to fetch recent orders',
    //             error: error.message
    //         });
    //     }
    // }

    static async getRecentOrders(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit || 5, 10);

            const orders = await Order.getRecentOrders(userId, limit);

            const formatted = orders.map(o => ({
                orderId: o.orderId,
                orderStatus: o.orderStatus,
                totalAmount: o.totalAmount,
                totalItems: Number(o.totalItems || 0),
                createdAt: o.createdAt
            }));

            return res.json({ success: true, data: formatted });
        } catch (error) {
            console.error('Get recent orders error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch recent orders', error: error.message });
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

            if (status) query.orderStatus = status;
            if (paymentStatus) query.paymentStatus = paymentStatus;

            if (search) {
                query.$or = [
                    { orderId: { $regex: search, $options: 'i' } },
                    { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
                    { 'shippingAddress.phoneNumber': { $regex: search, $options: 'i' } }
                ];
            }

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const orders = await Order.find(query)
                .populate('userId', 'name email phoneNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const totalOrders = await Order.countDocuments(query);

            const formattedOrders = orders.map((order) => ({
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
