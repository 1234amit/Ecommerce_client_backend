import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
// import userRoutes from "./routes/userRoutes.js";
import AuthRoutes from "./routes/AuthRoutes.js";
import bodyParser from "body-parser";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import adminRoutes from "./routes/admin/adminRoutes.js";
import consumerRoutes from "./routes/consumer/consumerRoutes.js";
import producerRoutes from "./routes/producer/producerRoutes.js";
import supersalerRoutes from "./routes/superseller/supersalerRoutes.js";
import wholesalerRoutes from "./routes/wholeseller/wholesalerRoutes.js";
import WishListRoutes from "./routes/WishListRoutes.js";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import profileRoutes from "./routes/profileRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/PaymentRoutes.js";
import productPublicRoutes from "./routes/producer/productPublicRoutes.js";
import reviewsRoutes from "./routes/reviewsRoutes.js";
import faqRoutes from "./routes/faqRoutes.js";
import chat from "./routes/chat.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { ensureSuperAdmin } from "./services/superAdminSeed.js";
import socketService from "./services/socketService.js";

dotenv.config();
await connectDB();
await ensureSuperAdmin();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = socketService.initialize(httpServer);
app.set('io', io);

// Middleware
app.use(bodyParser.json());

app.use(express.json());

app.use(
  cors({
    origin: [
      "https://krishighar.com",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://krishi-ghar.vercel.app",
      "https://krishi-ghar-admin.vercel.app",
      "https://krishi-test-frontend.vercel.app",
      "https://ecom-krishi-test.vercel.app",
      "https://admin.krishighar.com",
      "https://krishi-ghar-admin-two.vercel.app",
      "https://krishi-ghar-five.vercel.app"
    ],
    credentials: true, // Allow cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"],
  })
);

app.options(
  "*",
  cors({
    origin: [
      "https://krishighar.com",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://krishi-ghar.vercel.app",
      "https://krishi-ghar-admin.vercel.app",
      "https://krishi-test-frontend.vercel.app",
      "https://ecom-krishi-test.vercel.app",
      "https://admin.krishighar.com",
      "https://krishi-ghar-admin-two.vercel.app",
      "https://krishi-ghar-five.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"],
  })
);

// Routes
app.use("/api/v1", AuthRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/consumer", consumerRoutes);
app.use("/api/v1/producer", producerRoutes);
app.use("/api/v1/supersaler", supersalerRoutes);
app.use("/api/v1/wholesaler", wholesalerRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/wishlist", WishListRoutes);
app.use("/api/v1/addToCart", cartRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/payments", paymentRoutes)
app.use("/api/v1/products", productPublicRoutes);
app.use("/api/v1/reviews", reviewsRoutes);
app.use("/api/v1/chats", chat)
app.use("/api/v1/notifications", notificationRoutes)
app.use("/api/v1/faq", faqRoutes)


// Routes
// app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Wellcome to Krishi Ecommerce Backend!");
});

const PORT = process.env.PORT || 4001;
httpServer.listen(PORT, () => {
});
