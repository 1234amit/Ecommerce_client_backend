// routes/product/productPublicRoutes.js
import express from "express";
import { getProductPublic, listByProducer, listProducts, getPublicCategories } from "../../controllers/producer/productPublicController.js";


const router = express.Router();

// Option A: PUBLIC – no auth required
router.get("/", listProducts);
router.get("/categories", getPublicCategories); // Public categories endpoint
router.get("/:productId", getProductPublic);
router.get("/by-producer/:producerId", listByProducer);


export default router;
