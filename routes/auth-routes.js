import express from "express";
import { signup, login, forgotPassword, resetPassword, getAllUsers } from "../controllers/auth-controller.js";
import protect from "../middleware/auth-middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/users", protect, getAllUsers);

export default router;