import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
// import userRoutes from "./routes/userRoutes.js";
import AuthRoutes from "./routes/AuthRoutes.js";
import bodyParser from "body-parser";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Middleware
app.use(bodyParser.json());

// Routes
app.use("/api/v1", AuthRoutes);

// Routes
// app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Wellcome to Krishi Ecommerce Backend!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
