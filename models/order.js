import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * Payment proof metadata for an InstaPay transfer.
 *
 * IMPORTANT: this stores *metadata only*. The image bytes live on disk in a
 * private directory that is deliberately NOT exposed through express.static.
 * They are only ever streamed to an authenticated admin through
 * GET /api/payments/proof/:orderId.
 *
 * `fileName` is server-generated (uuid + an extension derived from the
 * detected image bytes). The client's filename is never used for storage or
 * for path construction.
 */
const paymentProofSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    /** Kept only so an admin knows what the customer believes they uploaded. */
    originalName: { type: String },
    /** Derived from the file signature, not from the client's Content-Type. */
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    /** Optional customer-supplied transfer reference (never trusted/verified). */
    reference: { type: String, default: null, maxlength: 64 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * Admin review trail for the payment proof.
 * An admin decision is the ONLY source of truth for payment verification -
 * uploading a screenshot never marks an order as paid.
 */
const paymentReviewSchema = new mongoose.Schema(
  {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    decision: { type: String, enum: ["Verified", "Rejected"], default: null },
    rejectionReason: { type: String, default: null, maxlength: 300 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },

    deliveryAddress: { type: String, required: true },
    deliveryCity: { type: String, required: true },
    deliverySlot: { type: String },
    deliveryNotes: { type: String },

    items: [orderItemSchema],

    subtotal: { type: Number, required: true },
    categoryDiscountTotal: { type: Number, default: 0 },
    couponCode: { type: String },
    couponDiscountTotal: { type: Number, default: 0 },
    pointsRedeemed: { type: Number, default: 0 },
    pointsDiscountTotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

    /**
     * Card payments have been removed. "Paid" is retained only so that
     * pre-existing documents in the collection still validate on read/save;
     * nothing new is ever written as "Paid".
     */
    paymentMethod: {
      type: String,
      enum: ["Cash", "InstaPay", "Card"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "Pending", // order placed, nothing submitted yet
        "ProofSubmitted", // screenshot uploaded, awaiting admin review
        "Verified", // admin confirmed the transfer
        "Rejected", // admin rejected, customer must resubmit
        "Paid", // LEGACY: pre-InstaPay card orders only
      ],
      default: "Pending",
    },

    paymentProof: { type: paymentProofSchema, default: null },
    paymentReview: { type: paymentReviewSchema, default: null },

    orderStatus: {
      type: String,
      enum: ["Placed", "OutForDelivery", "Delivered", "Cancelled"],
      default: "Placed",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;