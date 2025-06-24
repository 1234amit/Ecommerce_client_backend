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
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";
import { createServer } from "http";
import { initializeSocket } from './config/socket.js';
import path from 'path';
import { fileURLToPath } from 'url';
import profileRoutes from "./routes/profileRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);
app.set('io', io);

// Middleware
app.use(bodyParser.json());

app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://krishi-ghar.vercel.app",
      "https://krishi-ghar-admin.vercel.app",
      "https://krishi-test-frontend.vercel.app",
      "https://ecom-krishi-test.vercel.app"
    ],
    credentials: true, // Allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors()); 

// Routes
app.use("/api/v1", AuthRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/consumer", consumerRoutes);
app.use("/api/v1/producer", producerRoutes);
app.use("/api/v1/supersaler", supersalerRoutes);
app.use("/api/v1/wholesaler", wholesalerRoutes);
app.use("/api/v1/profile", profileRoutes);

// Routes
// app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Wellcome to Krishi Ecommerce Backend!");
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
