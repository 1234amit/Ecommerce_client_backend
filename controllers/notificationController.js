import Notification from "../models/Notification.js";
import socketService from "../services/socketService.js";

const getUserId = (req) => req.user?._id || req.user?.id;

export const getMyNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { page = 1, limit = 20, unread } = req.query;
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(50, Math.max(1, Number(limit) || 20));

    const query = { recipient: userId };
    if (unread === "true") query.isRead = false;

    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit),
      Notification.countDocuments({ recipient: userId, isRead: false }),
      Notification.countDocuments(query),
    ]);

    return res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        total,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getMyUnreadNotificationCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: getUserId(req),
      isRead: false,
    });

    return res.json({ success: true, unreadCount });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const markMyNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      recipient: getUserId(req),
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const wasUnread = !notification.isRead;
    await notification.markAsRead();

    return res.json({ success: true, notification });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const markAllMyNotificationsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    socketService.sendToUser(String(userId), "notification_count_changed", {
      unreadCount: 0,
    });

    return res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteMyNotification = async (req, res) => {
  try {
    const userId = getUserId(req);
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const wasUnread = !notification.isRead;
    await notification.deleteOne();

    socketService.sendToUser(String(userId), "notification:deleted", {
      notificationId: String(notification._id),
      wasUnread,
    });

    return res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
