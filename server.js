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

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(bodyParser.json());

app.use(
  cors({
    origin:
      ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://krishi-ghar.vercel.app", "https://krishi-ghar-admin.vercel.app"], // Allow requests from frontend
    credentials: true,
  })
);

app.use(express.json());

// ✅ Set Content Security Policy (CSP) using Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", "http://localhost:5000"], // Allow API requests
      },
    },
  })
);

// Routes
app.use("/api/v1", AuthRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/consumer", consumerRoutes);
app.use("/api/v1/producer", producerRoutes);
app.use("/api/v1/superseller", supersalerRoutes);
app.use("/api/v1/wholeseller", wholesalerRoutes);

// Routes
// app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Wellcome to Krishi Ecommerce Backend!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
