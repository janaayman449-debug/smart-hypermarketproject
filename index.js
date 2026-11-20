import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
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
import paymentRoutes from "./routes/payment-routes.js";
import notificationRoutes from "./routes/notification-routes.js";
import { ensureProofDir } from "./middleware/upload-payment-proof.js";
import { isInstapayConfigured } from "./config/instapay.js";
import { getPublicSocialConfig } from "./config/social-auth.js";

const app = express();
const PORT = process.env.PORT || 5000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Built Angular app (produced by `npm run build` inside smart-hypermarket-ui).
// Serving it from the API origin means one public tunnel exposes the whole
// application and the frontend can call the API with same-origin relative URLs.
const CLIENT_DIST = path.join(
  __dirname,
  "smart-hypermarket-ui",
  "dist",
  "smart-hypermarket-ui",
  "browser"
);
const hasClientBuild = fs.existsSync(path.join(CLIENT_DIST, "index.html"));

// Creates the private payment-proof directory at boot. These files are
// intentionally NOT added to express.static below.
ensureProofDir();

if (!isInstapayConfigured()) {
  console.warn(
    "[instapay] No receiving account configured. Set INSTAPAY_ACCOUNT_ID / " +
      "INSTAPAY_ACCOUNT_NUMBER in .env before accepting InstaPay orders."
  );
}

// The sign-in buttons are always rendered; this only reports whether they can
// actually complete a handshake. Values are read here (not exposed) purely so
// the missing keys are named at boot instead of on the user's first click.
{
  const social = getPublicSocialConfig();
  const missing = [];
  if (!social.googleEnabled) {
    missing.push("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
  }
  if (!social.facebookEnabled) {
    missing.push("FACEBOOK_APP_ID / FACEBOOK_APP_SECRET");
  }
  if (missing.length) {
    console.warn(
      "[social] Social sign-in unavailable. Set " +
        missing.join(" and ") +
        " in .env, then restart the server."
    );
  } else {
    const ready = [];
    if (social.googleEnabled) ready.push("google");
    if (social.facebookEnabled) ready.push("facebook");
    console.log(`[social] Sign-in ready: ${ready.join(", ")}`);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Public product imagery only. Payment proofs live in private-uploads/ and are
// only reachable through the authenticated admin route in payment-routes.js.
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
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/api/protected", protect, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "You accessed a protected route",
    user: req.user,
  });
});

// Lightweight health probe that always stays JSON.
app.get("/api", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Smart Hypermarket API is running",
  });
});

if (hasClientBuild) {
  // Static assets of the built Angular app (JS, CSS, favicon, ...).
  app.use(express.static(CLIENT_DIST));

  // Any other GET/HEAD request returns index.html so client-side routing
  // (e.g. /products, /admin) keeps working after a hard refresh. API and
  // upload paths are excluded so they keep returning their own responses.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    message: "Route not found",
  });
});

// ================= STARTUP =================
// MongoDB is connected BEFORE the server starts listening. Connecting without
// awaiting left the port open while the database was still unreachable, so API
// calls failed with an empty data connection instead of a clear startup error.
const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start().catch((error) => {
  console.error("\nStartup aborted: could not reach MongoDB.\n");
  console.error("  " + (error?.message || "unknown error"));
  console.error("");
  process.exit(1);
});