import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Chat from "../models/Chats/Chat.js";
import Message from "../models/Chats/Message.js";

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Map to store socketId -> userId
    this.userSockets = new Map(); // Map to store userId -> socketId
  }

  // Initialize Socket.IO with the HTTP server
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log("Socket.IO initialized");
  }

  // Setup Socket.IO middleware for authentication
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];
        
        if (!token) {
          return next(new Error("Authentication token required"));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.id).select("_id name role status");
        if (!user || user.status !== "approved") {
          return next(new Error("Invalid or inactive user"));
        }

        // Attach user info to socket
        socket.userId = user._id.toString();
        socket.userRole = user.role;
        socket.userName = user.name;
        
        next();
      } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });
  }

  // Setup Socket.IO event handlers
  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.userName} (${socket.userId})`);
      
      this.handleConnection(socket);
      this.handleDisconnection(socket);
      this.handleChatEvents(socket);
      this.handleTypingEvents(socket);
    });
  }

  // Handle user connection
  async handleConnection(socket) {
    try {
      const userId = socket.userId;
      
      // Store socket mappings
      this.connectedUsers.set(socket.id, userId);
      this.userSockets.set(userId, socket.id);

      // Update user online status
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        socketId: socket.id,
        lastSeen: new Date(),
      });

      // Join user to their personal room
      socket.join(`user_${userId}`);

      // If user is admin, join admin room
      if (socket.userRole === "admin") {
        socket.join("admin_room");
      }

      // Emit user online status to relevant users
      this.emitUserStatus(userId, true);

      // Send connection confirmation
      socket.emit("connected", {
        message: "Successfully connected to chat server",
        userId: userId,
        userRole: socket.userRole,
      });

    } catch (error) {
      console.error("Error handling connection:", error);
    }
  }

  // Handle user disconnection
  async handleDisconnection(socket) {
    try {
      const userId = socket.userId;
      
      // Remove socket mappings
      this.connectedUsers.delete(socket.id);
      this.userSockets.delete(userId);

      // Update user offline status
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        socketId: "",
        lastSeen: new Date(),
      });

      // Emit user offline status to relevant users
      this.emitUserStatus(userId, false);

      console.log(`User disconnected: ${socket.userName} (${userId})`);
    } catch (error) {
      console.error("Error handling disconnection:", error);
    }
  }

  // Handle chat-related events
  handleChatEvents(socket) {
    // Join chat room
    socket.on("join_chat", async (data) => {
      try {
        const { chatId } = data;
        const userId = socket.userId;

        // Verify user is participant in chat
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(userId)) {
          socket.emit("error", { message: "Access denied to this chat" });
          return;
        }

        // Join chat room
        socket.join(`chat_${chatId}`);
        socket.emit("joined_chat", { chatId, message: "Joined chat room" });

        // Notify other participants
        socket.to(`chat_${chatId}`).emit("user_joined_chat", {
          chatId,
          userId,
          userName: socket.userName,
        });

      } catch (error) {
        console.error("Error joining chat:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Leave chat room
    socket.on("leave_chat", (data) => {
      const { chatId } = data;
      socket.leave(`chat_${chatId}`);
      socket.emit("left_chat", { chatId, message: "Left chat room" });
    });

    // Handle typing indicators
    socket.on("typing_start", (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit("user_typing", {
        chatId,
        userId: socket.userId,
        userName: socket.userName,
        isTyping: true,
      });
    });

    socket.on("typing_stop", (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit("user_typing", {
        chatId,
        userId: socket.userId,
        userName: socket.userName,
        isTyping: false,
      });
    });

    // Handle message reactions
    socket.on("message_reaction", async (data) => {
      try {
        const { messageId, emoji } = data;
        const userId = socket.userId;

        // Find message and add reaction
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        await message.addReaction(userId, emoji);

        // Emit reaction to all users in the chat
        const chat = await Chat.findById(message.chatId);
        if (chat) {
          this.io.to(`chat_${chat._id}`).emit("message_reaction_added", {
            messageId,
            userId,
            userName: socket.userName,
            emoji,
          });
        }

      } catch (error) {
        console.error("Error handling message reaction:", error);
        socket.emit("error", { message: "Failed to add reaction" });
      }
    });
  }

  // Handle typing events
  handleTypingEvents(socket) {
    let typingTimers = new Map();

    socket.on("typing_start", (data) => {
      const { chatId } = data;
      
      // Clear existing timer
      if (typingTimers.has(chatId)) {
        clearTimeout(typingTimers.get(chatId));
      }

      // Emit typing start
      socket.to(`chat_${chatId}`).emit("user_typing", {
        chatId,
        userId: socket.userId,
        userName: socket.userName,
        isTyping: true,
      });

      // Set timer to stop typing indicator
      const timer = setTimeout(() => {
        socket.to(`chat_${chatId}`).emit("user_typing", {
          chatId,
          userId: socket.userId,
          userName: socket.userName,
          isTyping: false,
        });
        typingTimers.delete(chatId);
      }, 3000);

      typingTimers.set(chatId, timer);
    });

    socket.on("typing_stop", (data) => {
      const { chatId } = data;
      
      // Clear timer
      if (typingTimers.has(chatId)) {
        clearTimeout(typingTimers.get(chatId));
        typingTimers.delete(chatId);
      }

      // Emit typing stop
      socket.to(`chat_${chatId}`).emit("user_typing", {
        chatId,
        userId: socket.userId,
        userName: socket.userName,
        isTyping: false,
      });
    });
  }

  // Emit user status change
  async emitUserStatus(userId, isOnline) {
    try {
      // Get user's chats
      const chats = await Chat.find({
        participants: userId,
        isActive: true,
      });

      // Emit status to chat participants
      chats.forEach(chat => {
        const otherParticipants = chat.participants.filter(id => id.toString() !== userId);
        
        otherParticipants.forEach(participantId => {
          const participantSocketId = this.userSockets.get(participantId.toString());
          if (participantSocketId) {
            this.io.to(participantSocketId).emit("user_status_change", {
              userId,
              isOnline,
              lastSeen: new Date(),
            });
          }
        });
      });

    } catch (error) {
      console.error("Error emitting user status:", error);
    }
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Send message to chat room
  sendToChat(chatId, event, data) {
    this.io.to(`chat_${chatId}`).emit(event, data);
  }

  // Send message to admin room
  sendToAdmins(event, data) {
    this.io.to("admin_room").emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }

  // Get user's socket ID
  getUserSocketId(userId) {
    return this.userSockets.get(userId);
  }
}

export default new SocketService();
