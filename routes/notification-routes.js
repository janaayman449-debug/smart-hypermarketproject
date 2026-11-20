import express from "express";
import protect from "../middleware/auth-middleware.js";
import {
  getMyNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  removeNotification,
} from "../controllers/notification-controller.js";

const router = express.Router();

router.use(protect);

// Static segments first, so they are not captured by the /:id route below.
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllRead);

router.route("/").get(getMyNotifications);
router.route("/:id").patch(markRead).delete(removeNotification);

export default router;
