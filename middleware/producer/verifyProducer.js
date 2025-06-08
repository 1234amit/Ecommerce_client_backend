import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verifyProducer = (req, res, next) => {
  if (!req.user || req.user.role !== "producer") {
    return res.status(403).json({ message: "Forbidden: Only producers can add products." });
  }
  next();
};
