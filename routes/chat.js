import express from "express";

// import { rateLimiter } from "../middleware/auth.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { 
  addReaction, 
  assignChatToAdmin, 
  closeChat, 
  createOrGetChat, 
  deleteMessage, 
  editMessage, 
  getAdminChats, 
  getChatMessages, 
  getUserChats, 
  removeReaction, 
  resolveChat, 
  sendMessage,
  escalateChat,
  getChatStats,
  changeChatPriority,
  changeChatCategory
} from "../controllers/Chats/ChatController.js";

const router = express.Router();

// Apply rate limiting to chat routes
// router.use(rateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// All chat routes require authentication
router.use(verifyToken);

// Chat management routes
router.post("/create", createOrGetChat);
router.get("/user-chats", getUserChats);
router.get("/messages/:chatId", getChatMessages);

// Message routes
router.post("/send-message", sendMessage);
router.put("/messages/:messageId/edit", editMessage);
router.delete("/messages/:messageId", deleteMessage);
router.post("/messages/:messageId/reactions", addReaction);
router.delete("/messages/:messageId/reactions", removeReaction);

// Chat control routes
router.put("/:chatId/close", closeChat);

// Admin-only routes
router.get("/admin-chats", verifyToken, getAdminChats);
router.put("/:chatId/assign", verifyToken, assignChatToAdmin);
router.put("/:chatId/resolve", verifyToken, resolveChat);
router.put("/:chatId/escalate", verifyToken, escalateChat);
router.put("/:chatId/priority", verifyToken, changeChatPriority);
router.put("/:chatId/category", verifyToken, changeChatCategory);
router.get("/stats", verifyToken, getChatStats);

export default router;
