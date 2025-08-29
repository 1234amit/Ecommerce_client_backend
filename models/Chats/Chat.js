import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }],
    chatType: {
      type: String,
      enum: ["user_to_admin", "user_to_user", "support_request", "general_inquiry", "technical_issue", "billing_question"],
      default: "user_to_admin",
    },
    userType: {
      type: String,
      enum: ["producer", "wholesaler", "superseller", "consumer"],
      required: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageTime: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // For admin chats, track which admin is handling
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Chat metadata
    subject: {
      type: String,
      trim: true,
      default: "General Inquiry",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed", "escalated"],
      default: "open",
    },
    tags: [{
      type: String,
      trim: true,
    }],
    // Chat category for better organization
    category: {
      type: String,
      enum: ["sales", "support", "technical", "billing", "general", "complaint", "feedback"],
      default: "general",
    },
    // Escalation tracking
    escalationLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },
    escalatedAt: {
      type: Date,
    },
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Response time tracking
    firstResponseTime: {
      type: Date,
    },
    resolutionTime: {
      type: Date,
    },
    // Timestamps for tracking
    startedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    // Chat metrics
    messageCount: {
      type: Number,
      default: 0,
    },
    averageResponseTime: {
      type: Number, // in minutes
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
chatSchema.index({ participants: 1 });
chatSchema.index({ chatType: 1 });
chatSchema.index({ userType: 1 });
chatSchema.index({ assignedAdmin: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ priority: 1 });
chatSchema.index({ category: 1 });
chatSchema.index({ lastMessageTime: -1 });
chatSchema.index({ createdAt: -1 });

// Method to get chat participants excluding current user
chatSchema.methods.getOtherParticipants = function (currentUserId) {
  return this.participants.filter(
    (participant) => participant.toString() !== currentUserId.toString()
  );
};

// Method to update unread count for a specific user
chatSchema.methods.updateUnreadCount = function (userId, count) {
  this.unreadCount.set(userId.toString(), count);
  return this.save();
};

// Method to mark chat as resolved
chatSchema.methods.markAsResolved = function () {
  this.status = "resolved";
  this.resolvedAt = new Date();
  this.resolutionTime = new Date();
  return this.save();
};

// Method to close chat
chatSchema.methods.closeChat = function () {
  this.status = "closed";
  this.closedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Method to escalate chat
chatSchema.methods.escalateChat = function (escalatedBy) {
  this.escalationLevel = Math.min(this.escalationLevel + 1, 3);
  this.status = "escalated";
  this.escalatedAt = new Date();
  this.escalatedBy = escalatedBy;
  return this.save();
};

// Method to assign admin
chatSchema.methods.assignAdmin = function (adminId) {
  this.assignedAdmin = adminId;
  this.status = "in_progress";
  if (!this.firstResponseTime) {
    this.firstResponseTime = new Date();
  }
  return this.save();
};

// Method to update message count
chatSchema.methods.updateMessageCount = function () {
  this.messageCount += 1;
  return this.save();
};

// Static method to find or create chat between users
chatSchema.statics.findOrCreateChat = async function (participantIds, chatType = "user_to_admin", userType = "consumer") {
  // Check if chat already exists
  let chat = await this.findOne({
    participants: { $all: participantIds, $size: participantIds.length },
    chatType,
    userType,
    isActive: true,
  });

  if (!chat) {
    // Create new chat
    chat = new this({
      participants: participantIds,
      chatType,
      userType,
    });
    await chat.save();
  }

  return chat;
};

// Static method to get chat statistics
chatSchema.statics.getChatStats = async function (filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalChats: { $sum: 1 },
        openChats: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
        inProgressChats: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
        resolvedChats: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        closedChats: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
        averageResponseTime: { $avg: "$averageResponseTime" },
        totalMessages: { $sum: "$messageCount" },
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalChats: 0,
    openChats: 0,
    inProgressChats: 0,
    resolvedChats: 0,
    closedChats: 0,
    averageResponseTime: 0,
    totalMessages: 0,
  };
};

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
