// import jwt from "jsonwebtoken";
// import dotenv from "dotenv";

// dotenv.config();

// export const verifySuperSeller = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ message: "Unauthorized: No token provided" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.jwt_secret);
//     req.user = decoded; // Attach user details to request object
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Unauthorized: Invalid token" });
//   }
// };


import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../../models/User.js";

dotenv.config();

export const verifySuperSeller = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.jwt_secret);

    const userId = decoded.id || decoded._id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    if (user.role !== "supersaler") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    req.user = user; // ✅ now full user object (district/thana included)
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
