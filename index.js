import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import productRoutes from "./routes/product-routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect MongoDB
connectDB();

// Middleware
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static("uploads"));

// Product Routes
app.use("/api/products", productRoutes);

// Home Route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Smart Hypermarket API is running",
  });
});

// 404 Route
app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    message: "Route not found",
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});