import Chat from "../../models/Chats/Chat.js";
import Message from "../../models/Chats/Message.js";
import User from "../../models/User.js";
import Notification from "../../models/Notification.js";

// Create or get existing chat between user and admin
export const createOrGetChat = async (req, res) => {
  try {
    const { adminId, subject, priority, category, chatType = "user_to_admin" } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate user role (only specific user types can chat with admin)
    const allowedRoles = ["consumer", "producer", "wholesaler", "superseller"];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Your user type is not allowed to create chats" });
    }

    // Validate admin if adminId is provided
    if (adminId) {
      const admin = await User.findOne({ _id: adminId, role: "admin", status: "approved" });
      if (!admin) {
        return res.status(404).json({ message: "Admin not found or not approved" });
      }
    }

    // Check if user is blocked
    const user = await User.findById(userId);
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked. Please contact support." });
    }

    // Find or create chat
    let chat = await Chat.findOne({
      participants: { $all: [userId], $size: 1 },
      chatType,
      userType: userRole,
      isActive: true,
    });

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [userId],
        chatType,
        userType: userRole,
        subject: subject || `Support request from ${userRole}`,
        priority: priority || "medium",
        category: category || "general",
        tags: [userRole, chatType],
      });
      await chat.save();

      // Create system message
      const systemMessage = new Message({
        chatId: chat._id,
        sender: userId,
        receiver: userId, // Set receiver to sender for system messages to avoid validation issues
        content: `Chat started by ${userRole} user`,
        messageType: "system",
        isSystemMessage: true,
        systemMessageType: "user_joined",
        senderRole: userRole,
      });
      await systemMessage.save();

      // Update chat with last message
      chat.lastMessage = systemMessage._id;
      chat.lastMessageTime = systemMessage.createdAt;
      chat.messageCount = 1;
      await chat.save();

      // Create notification for all admins
      try {
        await Notification.createAdminNotification({
          sender: userId,
          type: "new_message",
          title: "New Support Request",
          message: `New ${userRole} support request: ${subject || 'General inquiry'}`,
          chatId: chat._id,
          messageId: systemMessage._id,
          priority: priority === "urgent" ? "urgent" : "normal"
        });
      } catch (notificationError) {
        console.error("Error creating admin notifications:", notificationError);
        // Don't fail the chat creation if notifications fail
      }
    }

    res.json({
      success: true,
      message: "Chat retrieved successfully",
      chat,
    });
  } catch (error) {
    console.error("Error in createOrGetChat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { chatId, content, messageType = "text", replyTo, mediaUrl, mediaThumbnail, mediaSize, mediaDuration, location, fileName, fileType } = req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role;

    // Validate chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is participant or admin
    if (!chat.participants.includes(senderId) && senderRole !== "admin") {
      return res.status(403).json({ message: "You are not a participant in this chat" });
    }

    // Check if chat is active
    if (!chat.isActive) {
      return res.status(400).json({ message: "This chat is no longer active" });
    }

    // Get receiver (other participant or admin)
    let receiverId;
    if (senderRole === "admin") {
      // Admin is sending message, receiver is the user
      receiverId = chat.participants.find(id => id.toString() !== senderId.toString());
    } else {
      // User is sending message, receiver is admin (if assigned) or the user themselves for now
      receiverId = chat.assignedAdmin || senderId;
    }

    // Create message
    const message = new Message({
      chatId,
      sender: senderId,
      receiver: receiverId,
      content,
      messageType,
      replyTo,
      mediaUrl,
      mediaThumbnail,
      mediaSize,
      mediaDuration,
      location,
      fileName,
      fileType,
      senderRole,
      priority: senderRole === "admin" ? "important" : "normal",
    });

    await message.save();

    // Update chat
    chat.lastMessage = message._id;
    chat.lastMessageTime = message.createdAt;
    chat.messageCount += 1;
    
    // Update unread count for receiver
    if (receiverId) {
      const currentUnreadCount = chat.unreadCount.get(receiverId.toString()) || 0;
      chat.unreadCount.set(receiverId.toString(), currentUnreadCount + 1);
    }
    
    await chat.save();

    // Populate sender and receiver details
    await message.populate([
      { path: "sender", select: "name profileImage role" },
      { path: "receiver", select: "name profileImage role" },
      { path: "replyTo", select: "content messageType" }
    ]);

    // Create notification for receiver
    if (receiverId) {
      await Notification.createChatNotification({
        recipient: receiverId,
        sender: senderId,
        type: "new_message",
        title: "New Message",
        message: `New message in chat: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        chatId: chat._id,
        messageId: message._id,
        priority: message.priority
      });
    }

    res.json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get chat messages
export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    // Validate chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is participant or admin
    if (!chat.participants.includes(userId) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You are not a participant in this chat" });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get messages
    const messages = await Message.find({
      chatId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate([
        { path: "sender", select: "name profileImage role" },
        { path: "receiver", select: "name profileImage role" },
        { path: "replyTo", select: "content messageType" }
      ]);

    // Mark messages as read
    await Message.updateMany(
      {
        chatId,
        receiver: userId,
        isRead: false,
        isDeleted: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    // Reset unread count for this user
    chat.unreadCount.set(userId.toString(), 0);
    await chat.save();

    // Get total count
    const totalMessages = await Message.countDocuments({
      chatId,
      isDeleted: false,
    });

    res.json({
      success: true,
      message: "Messages retrieved successfully",
      data: {
        messages: messages.reverse(), // Reverse to get chronological order
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMessages / parseInt(limit)),
          totalMessages,
          hasNextPage: skip + messages.length < totalMessages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error in getChatMessages:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user chats
export const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { page = 1, limit = 20, status, category } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {
      participants: userId,
      isActive: true,
    };

    if (status) query.status = status;
    if (category) query.category = category;

    // Get chats where user is participant
    const chats = await Chat.find(query)
      .sort({ lastMessageTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate([
        { path: "participants", select: "name profileImage role isOnline lastSeen" },
        { path: "lastMessage", select: "content messageType createdAt" },
        { path: "assignedAdmin", select: "name profileImage role" }
      ]);

    // Get total count
    const totalChats = await Chat.countDocuments(query);

    // Format chat data
    const formattedChats = chats.map(chat => {
      const otherParticipant = chat.participants.find(
        participant => participant._id.toString() !== userId
      );
      
      return {
        _id: chat._id,
        chatType: chat.chatType,
        userType: chat.userType,
        otherParticipant,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount: chat.unreadCount.get(userId.toString()) || 0,
        subject: chat.subject,
        priority: chat.priority,
        status: chat.status,
        category: chat.category,
        assignedAdmin: chat.assignedAdmin,
        startedAt: chat.startedAt,
        messageCount: chat.messageCount,
        escalationLevel: chat.escalationLevel,
      };
    });

    res.json({
      success: true,
      message: "Chats retrieved successfully",
      data: {
        chats: formattedChats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalChats / parseInt(limit)),
          totalChats,
          hasNextPage: skip + chats.length < totalChats,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error in getUserChats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get admin chats (for admin users)
export const getAdminChats = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    const { page = 1, limit = 20, status, priority, userType, category } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {
      chatType: "user_to_admin",
      isActive: true,
    };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (userType) query.userType = userType;
    if (category) query.category = category;

    // Get chats assigned to this admin or unassigned
    const chats = await Chat.find({
      $or: [
        { assignedAdmin: adminId },
        { assignedAdmin: { $exists: false } }
      ],
      ...query,
    })
      .sort({ priority: -1, lastMessageTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate([
        { path: "participants", select: "name profileImage role isOnline lastSeen" },
        { path: "lastMessage", select: "content messageType createdAt" },
        { path: "assignedAdmin", select: "name profileImage role" }
      ]);

    // Get total count
    const totalChats = await Chat.countDocuments({
      $or: [
        { assignedAdmin: adminId },
        { assignedAdmin: { $exists: false } }
      ],
      ...query,
    });

    // Format chat data
    const formattedChats = chats.map(chat => {
      const user = chat.participants.find(
        participant => participant.role !== "admin"
      );
      
      return {
        _id: chat._id,
        user,
        userType: chat.userType,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount: chat.unreadCount.get(adminId.toString()) || 0,
        subject: chat.subject,
        priority: chat.priority,
        status: chat.status,
        category: chat.category,
        assignedAdmin: chat.assignedAdmin,
        startedAt: chat.startedAt,
        messageCount: chat.messageCount,
        escalationLevel: chat.escalationLevel,
        firstResponseTime: chat.firstResponseTime,
      };
    });

    res.json({
      success: true,
      message: "Admin chats retrieved successfully",
      data: {
        chats: formattedChats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalChats / parseInt(limit)),
          totalChats,
          hasNextPage: skip + chats.length < totalChats,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error in getAdminChats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Assign chat to admin
export const assignChatToAdmin = async (req, res) => {
  try {
    const { chatId } = req.params;
    const adminId = req.user.id;

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    // Find chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if chat is already assigned
    if (chat.assignedAdmin && chat.assignedAdmin.toString() === adminId) {
      return res.status(400).json({ message: "Chat is already assigned to you" });
    }

    // Assign chat to admin
    await chat.assignAdmin(adminId);

    // Create system message
    const systemMessage = new Message({
      chatId: chat._id,
      sender: adminId,
      receiver: chat.participants.find(id => id.toString() !== adminId),
      content: "Admin has been assigned to your chat",
      messageType: "system",
      isSystemMessage: true,
      systemMessageType: "admin_assigned",
      senderRole: "admin",
    });
    await systemMessage.save();

    // Update chat with last message
    chat.lastMessage = systemMessage._id;
    chat.lastMessageTime = systemMessage.createdAt;
    chat.messageCount += 1;
    await chat.save();

    // Create notification for user
    const user = chat.participants.find(id => id.toString() !== adminId);
    if (user) {
      await Notification.createChatNotification({
        recipient: user,
        sender: adminId,
        type: "chat_assigned",
        title: "Chat Assigned",
        message: "An admin has been assigned to your chat",
        chatId: chat._id,
        messageId: systemMessage._id,
        priority: "normal"
      });
    }

    res.json({
      success: true,
      message: "Chat assigned successfully",
      data: chat,
    });
  } catch (error) {
    console.error("Error in assignChatToAdmin:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark chat as resolved
export const resolveChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const adminId = req.user.id;

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    // Find chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if admin is assigned to this chat
    if (chat.assignedAdmin?.toString() !== adminId) {
      return res.status(403).json({ message: "You are not assigned to this chat" });
    }

    // Mark chat as resolved
    await chat.markAsResolved();

    // Create system message
    const systemMessage = new Message({
      chatId: chat._id,
      sender: adminId,
      receiver: chat.participants.find(id => id.toString() !== adminId),
      content: "This chat has been marked as resolved",
      messageType: "system",
      isSystemMessage: true,
      systemMessageType: "chat_resolved",
      senderRole: "admin",
    });
    await systemMessage.save();

    // Update chat with last message
    chat.lastMessage = systemMessage._id;
    chat.lastMessageTime = systemMessage.createdAt;
    chat.messageCount += 1;
    await chat.save();

    // Create notification for user
    const user = chat.participants.find(id => id.toString() !== adminId);
    if (user) {
      await Notification.createChatNotification({
        recipient: user,
        sender: adminId,
        type: "chat_resolved",
        title: "Chat Resolved",
        message: "Your chat has been marked as resolved",
        chatId: chat._id,
        messageId: systemMessage._id,
        priority: "normal"
      });
    }

    res.json({
      success: true,
      message: "Chat marked as resolved",
      data: chat,
    });
  } catch (error) {
    console.error("Error in resolveChat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Escalate chat
export const escalateChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    // Find chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if admin is assigned to this chat
    if (chat.assignedAdmin?.toString() !== adminId) {
      return res.status(403).json({ message: "You are not assigned to this chat" });
    }

    // Escalate chat
    await chat.escalateChat(adminId);

    // Create system message
    const systemMessage = new Message({
      chatId: chat._id,
      sender: adminId,
      receiver: chat.participants.find(id => id.toString() !== adminId),
      content: `Chat escalated to level ${chat.escalationLevel}${reason ? `: ${reason}` : ''}`,
      messageType: "system",
      isSystemMessage: true,
      systemMessageType: "chat_escalated",
      senderRole: "admin",
    });
    await systemMessage.save();

    // Update chat with last message
    chat.lastMessage = systemMessage._id;
    chat.lastMessageTime = systemMessage.createdAt;
    chat.messageCount += 1;
    await chat.save();

    // Create notification for user
    const user = chat.participants.find(id => id.toString() !== adminId);
    if (user) {
      await Notification.createChatNotification({
        recipient: user,
        sender: adminId,
        type: "chat_escalated",
        title: "Chat Escalated",
        message: "Your chat has been escalated for further assistance",
        chatId: chat._id,
        messageId: systemMessage._id,
        priority: "high"
      });
    }

    res.json({
      success: true,
      message: "Chat escalated successfully",
      data: chat,
    });
  } catch (error) {
    console.error("Error in escalateChat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Close chat
export const closeChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Find chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is participant or admin
    if (!chat.participants.includes(userId) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Close chat
    await chat.closeChat();

    // Create system message
    const systemMessage = new Message({
      chatId: chat._id,
      sender: userId,
      receiver: chat.participants.find(id => id.toString() !== userId),
      content: "This chat has been closed",
      messageType: "system",
      isSystemMessage: true,
      systemMessageType: "chat_closed",
      senderRole: req.user.role,
    });
    await systemMessage.save();

    // Update chat with last message
    chat.lastMessage = systemMessage._id;
    chat.lastMessageTime = systemMessage.createdAt;
    chat.messageCount += 1;
    await chat.save();

    // Create notification for other participants
    const otherParticipants = chat.participants.filter(id => id.toString() !== userId);
    for (const participantId of otherParticipants) {
      await Notification.createChatNotification({
        recipient: participantId,
        sender: userId,
        type: "chat_closed",
        title: "Chat Closed",
        message: "A chat you were participating in has been closed",
        chatId: chat._id,
        messageId: systemMessage._id,
        priority: "normal"
      });
    }

    res.json({
      success: true,
      message: "Chat closed successfully",
      data: chat,
    });
  } catch (error) {
    console.error("Error in closeChat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is sender or admin
    if (message.sender.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    // Mark message as deleted
    await message.markAsDeleted(userId);

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Edit message
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is sender
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }

    // Check if message is not deleted
    if (message.isDeleted) {
      return res.status(400).json({ message: "Cannot edit deleted message" });
    }

    // Edit message
    await message.editMessage(content);

    res.json({
      success: true,
      message: "Message edited successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error in editMessage:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add reaction to message
export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if message is not deleted
    if (message.isDeleted) {
      return res.status(400).json({ message: "Cannot react to deleted message" });
    }

    // Add reaction
    await message.addReaction(userId, emoji);

    res.json({
      success: true,
      message: "Reaction added successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error in addReaction:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove reaction from message
export const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Remove reaction
    await message.removeReaction(userId);

    res.json({
      success: true,
      message: "Reaction removed successfully",
    });
  } catch (error) {
    console.error("Error in removeReaction:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get chat statistics (admin only)
export const getChatStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    const { userType, status, category, startDate, endDate } = req.query;

    // Build filters
    const filters = {};
    if (userType) filters.userType = userType;
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Get chat statistics
    const chatStats = await Chat.getChatStats(filters);
    
    // Get message statistics
    const messageStats = await Message.getMessageStats(filters);

    res.json({
      success: true,
      message: "Chat statistics retrieved successfully",
      data: {
        chats: chatStats,
        messages: messageStats,
      },
    });
  } catch (error) {
    console.error("Error in getChatStats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Change chat priority (admin only)
export const changeChatPriority = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { priority } = req.body;
    const adminId = req.user.id;

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    if (!priority || !["low", "medium", "high", "urgent"].includes(priority)) {
      return res.status(400).json({ message: "Valid priority is required" });
    }

    // Find chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Update priority
    chat.priority = priority;
    await chat.save();

    // Create system message
    const systemMessage = new Message({
      chatId: chat._id,
      sender: adminId,
      receiver: chat.participants.find(id => id.toString() !== adminId),
      content: `Chat priority changed to ${priority}`,
      messageType: "system",
      isSystemMessage: true,
      systemMessageType: "priority_changed",
      senderRole: "admin",
    });
    await systemMessage.save();

    // Update chat with last message
    chat.lastMessage = systemMessage._id;
    chat.lastMessageTime = systemMessage.createdAt;
    chat.messageCount += 1;
    await chat.save();

    res.json({
      success: true,
      message: "Chat priority updated successfully",
      data: chat,
    });
  } catch (error) {
    console.error("Error in changeChatPriority:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Change chat category (admin only)
export const changeChatCategory = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { category } = req.body;
    const adminId = req.user.id;

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    if (!category || !["sales", "support", "technical", "billing", "general", "complaint", "feedback"].includes(category)) {
      return res.status(400).json({ message: "Valid category is required" });
    }

    // Find chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Update category
    chat.category = category;
    await chat.save();

    // Create system message
    const systemMessage = new Message({
      chatId: chat._id,
      sender: adminId,
      receiver: chat.participants.find(id => id.toString() !== adminId),
      content: `Chat category changed to ${category}`,
      messageType: "system",
      isSystemMessage: true,
      systemMessageType: "category_changed",
      senderRole: "admin",
    });
    await systemMessage.save();

    // Update chat with last message
    chat.lastMessage = systemMessage._id;
    chat.lastMessageTime = systemMessage.createdAt;
    chat.messageCount += 1;
    await chat.save();

    res.json({
      success: true,
      message: "Chat category updated successfully",
      data: chat,
    });
  } catch (error) {
    console.error("Error in changeChatCategory:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
