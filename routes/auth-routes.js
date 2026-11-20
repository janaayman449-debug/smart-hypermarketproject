import express from "express";
import { signup, login, forgotPassword, resetPassword, getAllUsers } from "../controllers/auth-controller.js";
import {
  socialConfig,
  googleLogin,
  facebookLogin,
  linkSocialAccount,
} from "../controllers/social-auth-controller.js";
import protect from "../middleware/auth-middleware.js";

const router = express.Router();

// --- existing email/password auth: unchanged ---
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/users", protect, getAllUsers);

// --- social auth: additional method, same JWT session ---
// Public (non-secret) ids so the frontend can render the provider buttons.
router.get("/social/config", socialConfig);
router.post("/social/google", googleLogin);
router.post("/social/facebook", facebookLogin);
// Linking an existing account needs a session AND the account password.
router.post("/social/link", protect, linkSocialAccount);

export default router;
