import express from "express";
import protect, { adminOnly } from "../middleware/auth-middleware.js";
import uploadProof from "../middleware/upload-payment-proof.js";
import {
  getInstapayInfo,
  submitProof,
  getProofImage,
  listVerifications,
  reviewPayment,
} from "../controllers/payment-controller.js";

const router = express.Router();

/**
 * InstaPay account details, from backend config (not hardcoded in the UI).
 * Requires login, matching the rest of the checkout flow.
 */
router.get("/instapay", protect, getInstapayInfo);

/**
 * Admin verification queue. Declared BEFORE the /:orderId routes so that
 * "verification" is not swallowed as an order id.
 */
router.get("/verification", protect, adminOnly, listVerifications);
router.patch("/verification/:orderId", protect, adminOnly, reviewPayment);

/** Private screenshot stream. Never mounted in express.static. */
router.get("/proof/:orderId", protect, adminOnly, getProofImage);

/** Customer uploads a transfer screenshot for an order they own. */
router.post("/proof/:orderId", protect, uploadProof.single("proof"), submitProof);

export default router;
