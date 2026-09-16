import express from "express";
import protect from "../middleware/auth-middleware.js";
import {
  createMessage,
  getAllMessages,
  markAsRead,
} from "../controllers/message-controller.js";

const router = express.Router();

router.post("/", createMessage);

router.get("/", protect, getAllMessages);
router.patch("/:id/read", protect, markAsRead);

export default router;