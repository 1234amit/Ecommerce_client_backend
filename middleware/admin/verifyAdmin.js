import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { isAdminRole } from "../../utils/roles.js";

dotenv.config();

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.jwt_secret);
    req.user = decoded; // Attach user details to request object
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
