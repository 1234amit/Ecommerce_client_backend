import mongoose from "mongoose";

const deviceSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceName: {
      type: String,
      default: "Unknown device",
    },
    browser: {
      type: String,
      default: "Unknown browser",
    },
    os: {
      type: String,
      default: "Unknown OS",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

deviceSessionSchema.index({ user: 1, revokedAt: 1, lastActiveAt: -1 });

const DeviceSession = mongoose.model("DeviceSession", deviceSessionSchema);
export default DeviceSession;
