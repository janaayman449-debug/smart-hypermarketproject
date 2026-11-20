import mongoose from "mongoose";

/**
 * Notification types.
 *
 * These are stable machine keys. The UI resolves a human title/body from its
 * own translation table (see notifications.ts in the frontend) so that the same
 * stored row renders correctly in Arabic and in English.
 */
export const NOTIFICATION_TYPES = [
  "order_created",
  "payment_proof_required",
  "payment_proof_submitted",
  "payment_verified",
  "payment_rejected",
  "order_confirmed",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
];

const notificationSchema = new mongoose.Schema(
  {
    /**
     * Recipient.
     *
     * - customer notification -> the owning user's id
     * - admin notification    -> null, with audience "admin"
     *
     * Admin notifications are broadcast rows rather than per-user rows so that
     * every admin sees a new transfer without needing a fan-out write, and so
     * that a newly-promoted admin is not missing history.
     */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    audience: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
      index: true,
    },

    type: { type: String, enum: NOTIFICATION_TYPES, required: true },

    /**
     * Interpolation payload for the UI message, e.g.
     * { orderNumber: "SH-12345", reason: "..." }
     * The reason is included here so the customer notification can show why a
     * payment was rejected without the UI needing to re-fetch the order.
     */
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    orderNumber: { type: String },

    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Primary read path: "my notifications, newest first".
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ audience: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
