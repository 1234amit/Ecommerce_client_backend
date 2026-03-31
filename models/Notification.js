import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      required: true,
      enum: [
        // Product notifications
        "product_deletion_started", 
        "product_deletion_completed",

            // ✅ ADD THESE TWO
        "product_approved",
        "product_rejected",

        // Chat notifications
        "new_message",
        "chat_assigned",
        "chat_resolved",
        "chat_escalated",
        "chat_closed",
        "admin_response",
        "message_reaction",
        "chat_priority_changed",
        // User notifications
        "user_blocked",
        "user_unblocked",
        "role_changed",
        "status_changed",
        // System notifications
        "system_maintenance",
        "feature_update",
        "security_alert"
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    // Related entities
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    // Notification metadata
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    category: {
      type: String,
      enum: ["chat", "product", "user", "system", "security"],
      required: true,
    },
    // User type for filtering
    userType: {
      type: String,
      enum: ["admin", "consumer", "producer", "superseller", "wholesaler"],
    },
    // Notification status
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
    // Action buttons (for interactive notifications)
    actions: [{
      label: String,
      action: String,
      url: String,
      method: {
        type: String,
        enum: ["GET", "POST", "PUT", "DELETE"],
        default: "GET"
      }
    }],
    // Expiration
    expiresAt: {
      type: Date,
    },
    // For push notifications
    pushSent: {
      type: Boolean,
      default: false,
    },
    pushSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ userType: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 });

// Pre-save middleware to set category and userType
notificationSchema.pre("save", async function (next) {
  if (!this.category) {
    // Auto-set category based on type
    if (this.type.includes("chat")) {
      this.category = "chat";
    } else if (this.type.includes("product")) {
      this.category = "product";
    } else if (this.type.includes("user")) {
      this.category = "user";
    } else if (this.type.includes("system") || this.type.includes("security")) {
      this.category = "system";
    }
  }

  // Set userType if not provided
  if (!this.userType && this.recipient) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.recipient).select('role');
      if (user) {
        this.userType = user.role;
      }
    } catch (error) {
      console.error('Error setting userType:', error);
    }
  }

  next();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark as delivered
notificationSchema.methods.markAsDelivered = function () {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark push as sent
notificationSchema.methods.markPushSent = function () {
  if (!this.pushSent) {
    this.pushSent = true;
    this.pushSentAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get notification statistics
notificationSchema.statics.getNotificationStats = async function (filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalNotifications: { $sum: 1 },
        unreadNotifications: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
        deliveredNotifications: { $sum: { $cond: [{ $eq: ["$isDelivered", true] }, 1, 0] } },
        pushSentNotifications: { $sum: { $cond: [{ $eq: ["$pushSent", true] }, 1, 0] } },
        byCategory: {
          $push: {
            category: "$category",
            count: 1
          }
        },
        byPriority: {
          $push: {
            priority: "$priority",
            count: 1
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalNotifications: 0,
    unreadNotifications: 0,
    deliveredNotifications: 0,
    pushSentNotifications: 0,
    byCategory: [],
    byPriority: []
  };
};

// Static method to create chat notification
notificationSchema.statics.createChatNotification = async function (data) {
  const {
    recipient,
    sender,
    type,
    title,
    message,
    chatId,
    messageId,
    priority = "normal"
  } = data;

  const notification = new this({
    recipient,
    sender,
    type,
    title,
    message,
    chatId,
    messageId,
    priority,
    category: "chat"
  });

  return await notification.save();
};

// Static method to create notification for all admins
notificationSchema.statics.createAdminNotification = async function (data) {
  const {
    sender,
    type,
    title,
    message,
    chatId,
    messageId,
    priority = "normal"
  } = data;

  try {
    const User = mongoose.model('User');
    const admins = await User.find({ role: "admin", status: "approved" }).select('_id');
    
    const notifications = [];
    for (const admin of admins) {
      const notification = new this({
        recipient: admin._id,
        sender,
        type,
        title,
        message,
        chatId,
        messageId,
        priority,
        category: "chat"
      });
      notifications.push(notification.save());
    }
    
    return await Promise.all(notifications);
  } catch (error) {
    throw new Error(`Failed to create admin notifications: ${error.message}`);
  }
};



const Notification = mongoose.model("Notification", notificationSchema);
export default Notification; 