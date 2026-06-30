controllers/AuthController.js - Returns admin payload for admin-level login and records superadmin device sessions with a max of three active devices.
controllers/Chats/ChatController.js - Keeps chats scoped by product/order/support context, fixes realtime message payloads, supports unread counts, allows image-only Cloudinary messages, and admin chat deletion.
controllers/notificationController.js - Adds shared notification list, unread count, mark-read, mark-all-read, and delete APIs for all frontend roles.
controllers/OrderController.js - Preserves unit fields in product/order selections and keeps backend-calculated pricing fields.
controllers/admin/adminController.js - Adds custom product profit-rate updates, profit pricing breakdowns, profit report, category admin APIs, superadmin device list/revoke APIs, and product/order approval notification triggers.
controllers/producer/producerController.js - Preserves submitted product quantity/unit strings and accepts Cloudinary image URL strings.
controllers/producer/productPublicController.js - Returns unit fields and backend final-price data on public product APIs.
controllers/superseller/cartController.js - Adds superseller cart update/remove APIs, stock validation, and priced cart responses.
controllers/superseller/superSellerController.js - Preserves submitted product unit strings and maintains superseller order/product flow fixes.
middleware/admin/verifyAdmin.js - Treats superadmin as admin-level while preserving original auth role.
middleware/verifyToken.js - Enforces active device sessions for superadmin tokens.
models/DeviceSession.js - Stores superadmin logged-in device/session history for revoke support.
models/Notification.js - Adds order approval/rejection notification types and supports the supersaler role value.
models/Product.js - Adds unit, total price, price per kg, ownership history, sold fields, and custom admin profit rate.
models/Order.js - Stores backend-calculated base/profit pricing fields.
models/BulkOrder.js - Stores backend-calculated bulk order base/profit/delivery fields.
package.json - Adds ua-parser-js for superadmin device/browser detection.
package-lock.json - Locks ua-parser-js dependency for repeatable installs.
routes/admin/adminRoutes.js - Exposes product profit-rate update, profit report, category CRUD, and superadmin device routes.
routes/chat.js - Exposes admin unread count and admin chat delete routes.
routes/notificationRoutes.js - Exposes shared authenticated notification APIs for read/unread/delete actions.
routes/consumer/consumerRoutes.js - Uses memory storage so backend does not create local upload files.
routes/producer/producerRoutes.js - Uses memory storage so backend does not create local upload files.
routes/profileRoutes.js - Uses memory storage so backend does not create local upload files.
routes/superseller/supersalerRoutes.js - Adds superseller cart update/remove routes and uses memory storage for uploads.
routes/wholeseller/wholesalerRoutes.js - Uses memory storage so backend does not create local upload files.
server.js - Initializes shared chat socket service, seeds superadmin, and allows cache-control/pragma CORS headers.
services/chatService.js - Supports admin-level role checks for chat access.
services/notificationService.js - Creates user notifications and emits realtime Socket.IO notification events.
services/pricingService.js - Centralizes delivery charge, default/custom profit rates, and final pricing helpers.
services/socketService.js - Fixes socket lifecycle, local origins, JWT secret compatibility, and realtime chat delivery.
services/superAdminSeed.js - Ensures fixed superadmin account exists with approved status and hashed password.
utils/roles.js - Centralizes admin/superadmin role checks.
