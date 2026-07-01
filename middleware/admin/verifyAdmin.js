import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Admin from "../../models/Admin.js";
import User from "../../models/User.js";
import { isAdminRole } from "../../utils/roles.js";
import DeviceSession from "../../models/DeviceSession.js";

dotenv.config();

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.jwt_secret);
    const userId = decoded.id || decoded._id;
    let account =
      decoded.authModel === "Admin"
        ? await Admin.findById(userId).select("-password")
        : await User.findById(userId).select("-password");

    if (!account && decoded.authModel !== "Admin") {
      account = await Admin.findById(userId).select("-password");
    }

    if (!account) {
      return res.status(401).json({ message: "Unauthorized: Account not found" });
    }

    req.user = {
      ...account.toObject(),
      id: String(account._id),
      authModel: account.constructor.modelName,
    };

    if (decoded.role === "superadmin") {
      if (!decoded.sessionId) {
        return res.status(401).json({ message: "Unauthorized: Device session required" });
      }

      const session = await DeviceSession.findOne({
        user: userId,
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

    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// Middleware to check if user is an admin
export const verifyAdmin = (req, res, next) => {
  if (!isAdminRole(req.user.role)) {
    return res.status(403).json({ message: "Access Denied: Admins only" });
  }

  req.user.authRole = req.user.role;
  req.user.role = "admin";
  next();
};
