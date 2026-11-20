import Notification from "../models/notification.js";

/**
 * Notification API for BOTH audiences through one authenticated router.
 *
 * A customer's rows have `user = <their id>`; admins read the broadcast
 * `audience: "admin"` rows. Scoping happens here rather than in the router so
 * a customer can never pass a different id and read someone else's mail.
 */

function scopeFor(req) {
  if (req.user.role === "admin") {
    return { $or: [{ audience: "admin" }, { user: req.user.id }] };
  }
  return { user: req.user.id, audience: "customer" };
}

/** GET /api/notifications */
export const getMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const notifications = await Notification.find(scopeFor(req))
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      status: "success",
      count: notifications.length,
      data: { notifications },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * GET /api/notifications/unread-count
 * Separate light endpoint so the navbar/admin badge can poll cheaply without
 * downloading the whole list.
 */
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      ...scopeFor(req),
      read: false,
    });

    res.status(200).json({ status: "success", data: { unread: count } });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

/** PATCH /api/notifications/:id/read */
export const markRead = async (req, res) => {
  try {
    // The scope is part of the update filter, so a notification that is not
    // this caller's simply does not match - no IDOR.
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...scopeFor(req) },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ status: "fail", message: "Notification not found" });
    }

    res.status(200).json({ status: "success", data: { notification: updated } });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

/** PATCH /api/notifications/read-all */
export const markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { ...scopeFor(req), read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.status(200).json({
      status: "success",
      data: { updated: result.modifiedCount || 0 },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

/** DELETE /api/notifications/:id */
export const removeNotification = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      ...scopeFor(req),
    });

    if (!deleted) {
      return res.status(404).json({ status: "fail", message: "Notification not found" });
    }

    res.status(200).json({ status: "success" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
