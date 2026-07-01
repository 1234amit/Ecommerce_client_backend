import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from '../models/User.js';
import Admin from "../models/Admin.js";
import DeviceSession from "../models/DeviceSession.js";

dotenv.config();

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.jwt_secret);
    // Try both id and _id for compatibility
    let user = null;
    let authModel = decoded.authModel || "User";
    if (decoded.id) {
      user =
        decoded.authModel === "Admin"
          ? await Admin.findById(decoded.id).select("-password")
          : await User.findById(decoded.id).select('-password');
    } else if (decoded._id) {
      user =
        decoded.authModel === "Admin"
          ? await Admin.findById(decoded._id).select("-password")
          : await User.findById(decoded._id).select('-password');
    }

    if (!user && decoded.authModel !== "Admin") {
      user = await Admin.findById(decoded.id || decoded._id).select("-password");
      authModel = user ? "Admin" : authModel;
    }

    if (!user) {
      return res.status(401).json({ message: `Unauthorized: User not found for id: ${decoded.id || decoded._id}` });
    }
    if (user.role === "superadmin") {
      if (!decoded.sessionId) {
        return res.status(401).json({ message: "Unauthorized: Device session required" });
      }

      const session = await DeviceSession.findOne({
        user: user._id,
        sessionId: decoded.sessionId,
        revokedAt: null,
      });

      if (!session) {
        return res.status(401).json({ message: "Unauthorized: Device session revoked" });
      }

      session.lastActiveAt = new Date();
      await session.save();
      req.deviceSession = session;
    }
    req.user = user; // Attach full user object to request
    req.authModel = authModel;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
