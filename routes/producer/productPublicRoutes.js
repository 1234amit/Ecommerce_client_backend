// routes/product/productPublicRoutes.js
import express from "express";
import { getProductPublic, listByProducer, listProducts } from "../../controllers/producer/productPublicController.js";

// If you want to restrict to certain roles, import verifyToken + verifyRole
// import { verifyToken } from "../../middleware/verifyToken.js";
// import { verifyRole } from "../../middleware/verifyRole.js";

const router = express.Router();

// Option A: PUBLIC – no auth required
router.get("/", listProducts);
router.get("/:productId", getProductPublic);
router.get("/by-producer/:producerId", listByProducer);

// Option B: ROLE-BASED (uncomment, and comment Option A)
// router.get("/", verifyToken, verifyRole(["superSaler", "wholeSaler", "consumer"]), listProducts);
// router.get("/:productId", verifyToken, verifyRole(["superSaler", "wholeSaler", "consumer"]), getProductPublic);
// router.get("/by-producer/:producerId", verifyToken, verifyRole(["superSaler", "wholeSaler", "consumer"]), listByProducer);

export default router;
