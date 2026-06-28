controllers/admin/adminController.js - Centralized admin approval flow: validates stock, auto-marks all approved supersaler/wholesaler/consumer orders as paid, transfers ownership, deducts seller inventory once, and repairs approved order list responses.
controllers/OrderController.js - Requires approved active stock before consumer/normal orders can be created and returns any admin-approved order as paid.
controllers/producer/producerController.js - Returns full producer product history and sends edited rejected/approved products back to admin approval.
controllers/producer/productPublicController.js - Hides non-approved, non-selling, and zero-stock products from public product APIs.
controllers/superseller/cartController.js - Uses numeric stock checks and prevents adding unavailable producer products to super seller cart.
controllers/superseller/superSellerController.js - Filters available marketplace products by approved stock, repairs/returns admin-confirmed supersaler orders as paid, and prevents purchased product edits from exceeding owned stock.
controllers/superseller/sellPostController.js - Allows super sellers to create sell posts from their real owned products and enforces owned available quantity.
controllers/wholeseller/wholesalerController.js - Uses real wholesaler-owned products after approval, auto-returns approved bulk orders as paid, blocks pre-approval payment completion, filters available products, and removes offline-sold owned products.
controllers/PaymentController.js - Blocks user-side payment completion before admin approval.
models/Product.js - Adds sold quantity/time fields and source product ownership support for transfer history.
models/BulkOrder.js - Tracks whether bulk order inventory has already been deducted.
routes/admin/adminRoutes.js - Protects wholesaler order approve/reject endpoints with admin verification.
