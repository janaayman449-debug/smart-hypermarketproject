import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import productRoutes from "./routes/product-routes.js";
import wishlistRoutes from "./routes/wishlist-routes.js";
import cartRoutes from "./routes/cart-routes.js";
import messageRoutes from "./routes/message-routes.js";
import orderRoutes from "./routes/order-routes.js";
import returnRoutes from "./routes/return-routes.js";
import authRoutes from "./routes/auth-routes.js";
import protect from "./middleware/auth-middleware.js";
import offerRoutes from "./routes/offer-routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Connect MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static("uploads"));

// ================= ROUTES =================

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/offers", offerRoutes);

app.get("/api/protected", protect, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "You accessed a protected route",
    user: req.user,
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Smart Hypermarket API is running",
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    message: "Route not found",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});