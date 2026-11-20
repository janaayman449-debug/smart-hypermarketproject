import Notification from "../models/notification.js";
import Order from "../models/order.js";

/**
 * Single source of truth for notification creation.
 *
 * Both the customer-facing flow (order placed, proof submitted) and the
 * admin-facing flow (proof verified/rejected, order shipped) go through here,
 * which is what guarantees a customer action and the resulting admin
 * notification cannot drift apart.
 */

/** To the customer who owns the order. */
export async function notifyCustomer(order, type, data = {}) {
  return Notification.create({
    user: order.user,
    audience: "customer",
    type,
    order: order._id,
    orderNumber: order.orderNumber,
    data,
  });
}

/**
 * To every admin (broadcast row, audience "admin").
 * Fire-and-forget: a notification failure must never roll back the payment
 * action that triggered it, so callers should not await this in a transaction.
 */
export async function notifyAdmins(type, order, data = {}) {
  try {
    await Notification.create({
      user: null,
      audience: "admin",
      type,
      order: order ? order._id : null,
      orderNumber: order ? order.orderNumber : null,
      data,
    });
  } catch (error) {
    console.error("Failed to create admin notification", error.message);
  }
}

/**
 * The full lifecycle for one order, so every call site behaves identically.
 *
 * notifyOrderPlaced    - customer: order created + proof still required
 * notifyProofSubmitted - customer: proof received;  admin: needs review
 * notifyProofVerified  - customer: payment confirmed
 * notifyProofRejected  - customer: payment rejected, with the reason
 * notifyOrderStatus    - customer: confirmed / shipped / delivered / cancelled
 */
export const events = {
  async orderPlaced(order) {
    await notifyCustomer(order, "order_created");
    if (order.paymentMethod === "InstaPay") {
      await notifyCustomer(order, "payment_proof_required", {
        orderNumber: order.orderNumber,
      });
    }
  },

  async proofSubmitted(order) {
    await notifyCustomer(order, "payment_proof_submitted", {
      orderNumber: order.orderNumber,
    });
    await notifyAdmins("payment_proof_submitted", order, {
      orderNumber: order.orderNumber,
      grandTotal: order.grandTotal,
    });
  },

  async proofVerified(order, adminId) {
    await notifyCustomer(order, "payment_verified", {
      orderNumber: order.orderNumber,
    });
    await notifyAdmins("payment_verified", order, { orderNumber: order.orderNumber });
    void adminId;
  },

  async proofRejected(order, reason) {
    await notifyCustomer(order, "payment_rejected", {
      orderNumber: order.orderNumber,
      reason: reason || "",
    });
  },

  async orderStatusChanged(order, status) {
    const typeByStatus = {
      Placed: "order_confirmed",
      OutForDelivery: "order_shipped",
      Delivered: "order_delivered",
      Cancelled: "order_cancelled",
    };
    const type = typeByStatus[status];
    if (!type) return;
    await notifyCustomer(order, type, { orderNumber: order.orderNumber, status });
  },
};

/** Re-exported so controllers can build links without importing the model. */
export { Order };
