import mongoose from "mongoose";

const adminLogSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["info", "warning", "error", "vulnerability"],
      default: "info",
      index: true,
    },
    category: {
      type: String,
      default: "system",
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      default: "",
    },
    path: {
      type: String,
      default: "",
      index: true,
    },
    statusCode: {
      type: Number,
      default: 0,
      index: true,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userRole: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ level: 1, createdAt: -1 });

const AdminLog = mongoose.model("AdminLog", adminLogSchema);
export default AdminLog;
