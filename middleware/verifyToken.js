import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from '../models/User.js';

dotenv.config();

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.jwt_secret);
    console.log('Decoded JWT:', decoded); // Debug log
    // Try both id and _id for compatibility
    let user = null;
    if (decoded.id) {
      user = await User.findById(decoded.id).select('-password');
    } else if (decoded._id) {
      user = await User.findById(decoded._id).select('-password');
    }
    console.log('User found:', user); // Debug log
    if (!user) {
      return res.status(401).json({ message: `Unauthorized: User not found for id: ${decoded.id || decoded._id}` });
    }
    req.user = user; // Attach full user object to request
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
