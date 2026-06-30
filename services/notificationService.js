import Notification from "../models/Notification.js";
import socketService from "./socketService.js";

export const formatNotification = (notification) => {
  if (!notification) return null;
  const plain =
    typeof notification.toObject === "function"
      ? notification.toObject()
      : notification;

  return {
    ...plain,
    _id: String(plain._id),
    recipient: String(plain.recipient),
    sender: plain.sender ? String(plain.sender) : plain.sender,
    productId: plain.productId ? String(plain.productId) : plain.productId,
    chatId: plain.chatId ? String(plain.chatId) : plain.chatId,
    messageId: plain.messageId ? String(plain.messageId) : plain.messageId,
  };
};

export const createUserNotification = async (payload = {}) => {
  if (!payload.recipient) return null;

  const notification = await Notification.create({
    priority: "normal",
    isRead: false,
    ...payload,
  });

  const formatted = formatNotification(notification);
  socketService.sendToUser(String(payload.recipient), "notification:new", {
    notification: formatted,
  });
  socketService.sendToUser(String(payload.recipient), "notification_count_changed", {
    increment: 1,
    notificationId: formatted?._id,
  });

  return notification;
};

export const notifyProductDecision = async ({ product, adminId, approved, reason }) => {
  const recipient = product?.producer?._id || product?.producer;
  if (!recipient) return null;

  const productName = product?.productName || "পণ্য";

  return createUserNotification({
    recipient,
    sender: adminId,
    type: approved ? "product_approved" : "product_rejected",
    category: "product",
    title: approved ? "পণ্য অনুমোদিত হয়েছে" : "পণ্য বাতিল হয়েছে",
    message: approved
      ? `আপনার "${productName}" পণ্যটি অ্যাডমিন অনুমোদন করেছেন।`
      : `আপনার "${productName}" পণ্যটি অ্যাডমিন বাতিল করেছেন।${reason ? ` কারণ: ${reason}` : ""}`,
    productId: product._id,
    priority: approved ? "normal" : "high",
  });
};

export const notifyOrderDecision = async ({ order, adminId, approved, reason }) => {
  const recipient = order?.userId?._id || order?.userId || order?.buyer;
  if (!recipient) return null;

  const orderLabel = order?.orderId || order?._id || "অর্ডার";

  return createUserNotification({
    recipient,
    sender: adminId,
    type: approved ? "order_approved" : "order_rejected",
    category: "user",
    title: approved ? "অর্ডার অনুমোদিত হয়েছে" : "অর্ডার বাতিল হয়েছে",
    message: approved
      ? `আপনার ${orderLabel} অর্ডারটি অনুমোদিত হয়েছে। পেমেন্ট ও ডেলিভারি সম্পন্ন ধরা হয়েছে।`
      : `আপনার ${orderLabel} অর্ডারটি বাতিল হয়েছে।${reason ? ` কারণ: ${reason}` : ""}`,
    priority: approved ? "normal" : "high",
  });
};
