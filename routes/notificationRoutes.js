import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  deleteMyNotification,
  getMyNotifications,
  getMyUnreadNotificationCount,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getMyNotifications);
router.get("/unread-count", getMyUnreadNotificationCount);
router.patch("/mark-all-read", markAllMyNotificationsRead);
router.patch("/:notificationId/read", markMyNotificationRead);
router.delete("/:notificationId", deleteMyNotification);

export default router;
