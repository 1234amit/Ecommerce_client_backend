import Chat from "../models/Chats/Chat.js";
import Message from "../models/Chats/Message.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

class ChatService {
  // Create a new chat
  static async createChat(chatData) {
    try {
      const chat = new Chat(chatData);
      await chat.save();
      return chat;
    } catch (error) {
      throw new Error(`Failed to create chat: ${error.message}`);
    }
  }

  // Find or create chat between users
  static async findOrCreateChat(participantIds, chatType, userType) {
    try {
      return await Chat.findOrCreateChat(participantIds, chatType, userType);
    } catch (error) {
      throw new Error(`Failed to find or create chat: ${error.message}`);
    }
  }

  // Send a message
  static async sendMessage(messageData) {
    try {
      const message = new Message(messageData);
      await message.save();

      // Update chat message count and last message
      await Chat.findByIdAndUpdate(messageData.chatId, {
        lastMessage: message._id,
        lastMessageTime: message.createdAt,
        $inc: { messageCount: 1 }
      });

      return message;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  // Create system message
  static async createSystemMessage(chatId, senderId, content, systemMessageType, senderRole) {
    try {
      const systemMessage = new Message({
        chatId,
        sender: senderId,
        receiver: null,
        content,
        messageType: "system",
        isSystemMessage: true,
        systemMessageType,
        senderRole,
      });
      await systemMessage.save();

      // Update chat
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: systemMessage._id,
        lastMessageTime: systemMessage.createdAt,
        $inc: { messageCount: 1 }
      });

      return systemMessage;
    } catch (error) {
      throw new Error(`Failed to create system message: ${error.message}`);
    }
  }

  // Assign admin to chat
  static async assignAdminToChat(chatId, adminId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error("Chat not found");
      }

      await chat.assignAdmin(adminId);
      return chat;
    } catch (error) {
      throw new Error(`Failed to assign admin: ${error.message}`);
    }
  }

  // Mark chat as resolved
  static async resolveChat(chatId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error("Chat not found");
      }

      await chat.markAsResolved();
      return chat;
    } catch (error) {
      throw new Error(`Failed to resolve chat: ${error.message}`);
    }
  }

  // Escalate chat
  static async escalateChat(chatId, escalatedBy) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error("Chat not found");
      }

      await chat.escalateChat(escalatedBy);
      return chat;
    } catch (error) {
      throw new Error(`Failed to escalate chat: ${error.message}`);
    }
  }

  // Close chat
  static async closeChat(chatId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error("Chat not found");
      }

      await chat.closeChat();
      return chat;
    } catch (error) {
      throw new Error(`Failed to close chat: ${error.message}`);
    }
  }

  // Get chat statistics
  static async getChatStats(filters = {}) {
    try {
      const chatStats = await Chat.getChatStats(filters);
      const messageStats = await Message.getMessageStats(filters);
      
      return {
        chats: chatStats,
        messages: messageStats,
      };
    } catch (error) {
      throw new Error(`Failed to get chat stats: ${error.message}`);
    }
  }

  // Get user's unread message count
  static async getUnreadCount(userId) {
    try {
      const chats = await Chat.find({ participants: userId, isActive: true });
      let totalUnread = 0;

      for (const chat of chats) {
        const unreadCount = chat.unreadCount.get(userId.toString()) || 0;
        totalUnread += unreadCount;
      }

      return totalUnread;
    } catch (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(chatId, userId) {
    try {
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

      // Reset unread count for this user in chat
      await Chat.findByIdAndUpdate(chatId, {
        [`unreadCount.${userId}`]: 0
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }
  }

  // Get chat participants info
  static async getChatParticipants(chatId) {
    try {
      const chat = await Chat.findById(chatId).populate('participants', 'name profileImage role isOnline lastSeen');
      return chat ? chat.participants : [];
    } catch (error) {
      throw new Error(`Failed to get chat participants: ${error.message}`);
    }
  }

  // Check if user can access chat
  static async canUserAccessChat(chatId, userId, userRole) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return false;

      // Admin can access any chat
      if (userRole === "admin") return true;

      // User must be participant
      return chat.participants.includes(userId);
    } catch (error) {
      return false;
    }
  }

  // Get chat summary for list view
  static async getChatSummary(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId)
        .populate('participants', 'name profileImage role')
        .populate('lastMessage', 'content messageType createdAt')
        .populate('assignedAdmin', 'name profileImage role');

      if (!chat) return null;

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
    } catch (error) {
      throw new Error(`Failed to get chat summary: ${error.message}`);
    }
  }

  // Search chats
  static async searchChats(userId, userRole, searchQuery, filters = {}) {
    try {
      let query = { isActive: true };

      // Add user-specific filters
      if (userRole === "admin") {
        // Admin can see all chats or assigned chats
        if (filters.assignedToMe) {
          query.assignedAdmin = userId;
        }
      } else {
        // Regular users can only see their own chats
        query.participants = userId;
      }

      // Add search filters
      if (searchQuery) {
        query.$or = [
          { subject: { $regex: searchQuery, $options: 'i' } },
          { tags: { $in: [new RegExp(searchQuery, 'i')] } }
        ];
      }

      // Add other filters
      if (filters.status) query.status = filters.status;
      if (filters.priority) query.priority = filters.priority;
      if (filters.userType) query.userType = filters.userType;
      if (filters.category) query.category = filters.category;

      const chats = await Chat.find(query)
        .sort({ priority: -1, lastMessageTime: -1 })
        .populate('participants', 'name profileImage role')
        .populate('lastMessage', 'content messageType createdAt')
        .populate('assignedAdmin', 'name profileImage role');

      return chats;
    } catch (error) {
      throw new Error(`Failed to search chats: ${error.message}`);
    }
  }

  // Get chat analytics
  static async getChatAnalytics(adminId, timeRange = '7d') {
    try {
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const filters = {
        createdAt: { $gte: startDate },
        assignedAdmin: adminId
      };

      const stats = await Chat.getChatStats(filters);
      const messageStats = await Message.getMessageStats(filters);

      // Calculate response time metrics
      const chats = await Chat.find(filters);
      let totalResponseTime = 0;
      let respondedChats = 0;

      for (const chat of chats) {
        if (chat.firstResponseTime) {
          const responseTime = chat.firstResponseTime.getTime() - chat.startedAt.getTime();
          totalResponseTime += responseTime;
          respondedChats++;
        }
      }

      const averageResponseTime = respondedChats > 0 ? totalResponseTime / respondedChats : 0;

      return {
        ...stats,
        ...messageStats,
        averageResponseTime: Math.round(averageResponseTime / (1000 * 60)), // Convert to minutes
        respondedChats,
        totalChats: stats.totalChats,
        responseRate: respondedChats / stats.totalChats * 100
      };
    } catch (error) {
      throw new Error(`Failed to get chat analytics: ${error.message}`);
    }
  }
}

export default ChatService;
