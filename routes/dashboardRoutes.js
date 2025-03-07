import express from "express";
import {
  consumerDashboard,
  wholesalerDashboard,
  supersellerDashboard,
  producerDashboard,
  adminDashboard,
} from "../controllers/dashboardController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Role-Based Dashboards
router.get("/consumer-dashboard", verifyToken, consumerDashboard);
router.get("/wholesaler-dashboard", verifyToken, wholesalerDashboard);
router.get("/supersaler-dashboard", verifyToken, supersellerDashboard);
router.get("/producer-dashboard", verifyToken, producerDashboard);
router.get("/admin-dashboard", verifyToken, adminDashboard);

export default router;
