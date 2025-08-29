import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function() {
        // Receiver is not required for system messages
        return !this.isSystemMessage;
      },
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "audio", "video", "location", "system"],
      default: "text",
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // For media messages
    mediaUrl: {
      type: String,
      default: "",
    },
    mediaThumbnail: {
      type: String,
      default: "",
    },
    mediaSize: {
      type: Number, // in bytes
      default: 0,
    },
    mediaDuration: {
      type: Number, // in seconds, for audio/video
      default: 0,
    },
    // For location messages
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    // Message status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    // For edited messages
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    originalContent: {
      type: String,
    },
    // For deleted messages
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    // Message reactions
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      emoji: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // For system messages
    isSystemMessage: {
      type: Boolean,
      default: false,
    },
    systemMessageType: {
      type: String,
      enum: ["user_joined", "user_left", "admin_assigned", "chat_closed", "chat_resolved", "chat_escalated", "priority_changed", "category_changed"],
    },
    // Message metadata
    senderRole: {
      type: String,
      enum: ["admin", "consumer", "producer", "superseller", "wholesaler"],
    },
    // For file messages
    fileName: {
      type: String,
      default: "",
    },
    fileType: {
      type: String,
      default: "",
    },
    // Message priority (for admin messages)
    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal",
    },
    // For tracking message delivery
    deliveryAttempts: {
      type: Number,
      default: 0,
    },
    lastDeliveryAttempt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ receiver: 1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ isSystemMessage: 1 });

// Pre-save middleware to set delivered status and sender role
messageSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    
    // Set sender role if not already set
    if (!this.senderRole) {
      try {
        const User = mongoose.model('User');
        const sender = await User.findById(this.sender).select('role');
        if (sender) {
          this.senderRole = sender.role;
        }
      } catch (error) {
        console.error('Error setting sender role:', error);
      }
    }
  }
  next();
});

// Method to mark message as read
messageSchema.methods.markAsRead = function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark message as delivered
messageSchema.methods.markAsDelivered = function () {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark message as deleted
messageSchema.methods.markAsDeleted = function (deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Method to edit message
messageSchema.methods.editMessage = function (newContent) {
  if (!this.originalContent) {
    this.originalContent = this.content;
  }
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Method to add reaction
messageSchema.methods.addReaction = function (userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    (reaction) => reaction.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji,
    createdAt: new Date(),
  });
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function (userId) {
  this.reactions = this.reactions.filter(
    (reaction) => reaction.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to get message preview (for chat list)
messageSchema.methods.getPreview = function () {
  if (this.isDeleted) {
    return "This message was deleted";
  }
  
  if (this.messageType === "text") {
    return this.content.length > 50 
      ? this.content.substring(0, 50) + "..." 
      : this.content;
  }
  
  const typeLabels = {
    image: "📷 Image",
    file: "📎 File",
    audio: "🎵 Audio",
    video: "🎥 Video",
    location: "📍 Location",
    system: "ℹ️ System",
  };
  
  return typeLabels[this.messageType] || "Media message";
};

// Static method to get unread count for a user in a chat
messageSchema.statics.getUnreadCount = async function (chatId, userId) {
  return await this.countDocuments({
    chatId,
    receiver: userId,
    isRead: false,
    isDeleted: false,
  });
};

// Static method to get message statistics
messageSchema.statics.getMessageStats = async function (filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        textMessages: { $sum: { $cond: [{ $eq: ["$messageType", "text"] }, 1, 0] } },
        mediaMessages: { $sum: { $cond: [{ $in: ["$messageType", ["image", "file", "audio", "video"]] }, 1, 0] } },
        systemMessages: { $sum: { $cond: [{ $eq: ["$messageType", "system"] }, 1, 0] } },
        unreadMessages: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
        averageReactions: { $avg: { $size: "$reactions" } },
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalMessages: 0,
    textMessages: 0,
    mediaMessages: 0,
    systemMessages: 0,
    unreadMessages: 0,
    averageReactions: 0,
  };
};

const Message = mongoose.model("Message", messageSchema);

export default Message;
