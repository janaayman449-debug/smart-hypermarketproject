import fs from "fs";
import Order from "../models/order.js";
import {
  getInstapayPublicInfo,
  buildInstapayCopyText,
  isInstapayConfigured,
} from "../config/instapay.js";
import {
  persistProof,
  resolveProofPath,
  MAX_PROOF_BYTES,
} from "../middleware/upload-payment-proof.js";
import { events } from "../services/notification.service.js";

/** Rejection reasons offered to the admin, matching the UI. */
export const REJECTION_REASONS = [
  "amount_mismatch",
  "transfer_not_found",
  "unclear_screenshot",
  "invalid_reference",
  "other",
];

/**
 * GET /api/payments/instapay
 * The receiving account details, served from backend configuration so the
 * checkout never hardcodes payment credentials.
 */
export const getInstapayInfo = async (req, res) => {
  try {
    if (!isInstapayConfigured()) {
      // Not a crash: the operator still needs to be able to load checkout and
      // see that payments are not yet configured.
      return res.status(200).json({
        status: "success",
        data: {
          instapay: getInstapayPublicInfo(),
          copyText: "",
          maxUploadBytes: MAX_PROOF_BYTES,
          acceptedFormats: ["image/jpeg", "image/png", "image/webp"],
        },
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        instapay: getInstapayPublicInfo(),
        copyText: buildInstapayCopyText(),
        maxUploadBytes: MAX_PROOF_BYTES,
        acceptedFormats: ["image/jpeg", "image/png", "image/webp"],
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * POST /api/payments/proof/:orderId   (multipart/form-data, field: "proof")
 *
 * The customer attaches a transfer screenshot to an order they own.
 *
 * This endpoint can ONLY ever move an order to "ProofSubmitted". It has no
 * code path that sets a verified/paid state - that is exclusively the admin
 * review endpoint's job.
 */
export const submitProof = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found",
      });
    }

    if (order.paymentMethod !== "InstaPay") {
      return res.status(400).json({
        status: "fail",
        message: "This order is not an InstaPay order",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: "fail",
        message: "No payment proof image was uploaded",
      });
    }

    if (order.paymentStatus === "Verified") {
      return res.status(409).json({
        status: "fail",
        message: "This payment has already been verified",
      });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(409).json({
        status: "fail",
        message: "This order has been cancelled",
      });
    }

    // Validate the bytes and write to the private directory. Throws with a
    // 4xx status if the file is not a genuine supported image or is too big.
    const stored = persistProof(req.file);

    // Replace rather than accumulate: drop any previously submitted proof so a
    // resubmission does not leave orphaned sensitive files on disk.
    if (order.paymentProof && order.paymentProof.fileName) {
      const previous = resolveProofPath(order.paymentProof.fileName);
      if (previous) {
        fs.promises.unlink(previous).catch(() => {});
      }
    }

    order.paymentProof = {
      fileName: stored.fileName,
      originalName: stored.originalName,
      mimeType: stored.mimeType,
      size: stored.size,
      reference: (req.body && req.body.reference ? String(req.body.reference) : null)
        .trim()
        .slice(0, 64) || null,
      uploadedAt: new Date(),
    };

    // A resubmission after a rejection clears the previous decision.
    order.paymentStatus = "ProofSubmitted";
    order.paymentReview = {
      reviewedBy: null,
      reviewedAt: null,
      decision: null,
      rejectionReason: null,
    };

    await order.save();

    await events.proofSubmitted(order);

    res.status(201).json({
      status: "success",
      message: "Payment proof submitted for review",
      data: {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        submittedAt: order.paymentProof.uploadedAt,
      },
    });
  } catch (error) {
    if (isMulterLimitError(error)) {
      const tooBig = error.code === "LIMIT_FILE_SIZE";
      return res.status(tooBig ? 413 : 400).json({
        status: "fail",
        message: tooBig
          ? "The uploaded image is larger than the 4 MB limit"
          : error.message || "The uploaded file was rejected",
      });
    }

    const status = error.status || 500;
    res.status(status).json({
      status: status === 500 ? "error" : "fail",
      message: error.message,
    });
  }
};

/**
 * GET /api/payments/proof/:orderId   (admin only)
 *
 * Streams the stored screenshot. This is the ONLY way to reach the file - the
 * private directory is not mounted in express.static, so there is no public
 * URL for a payment document.
 */
export const getProofImage = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admins only" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ status: "fail", message: "Order not found" });
    }

    if (!order.paymentProof || !order.paymentProof.fileName) {
      return res.status(404).json({
        status: "fail",
        message: "No payment proof has been submitted for this order",
      });
    }

    const absolute = resolveProofPath(order.paymentProof.fileName);
    if (!absolute || !fs.existsSync(absolute)) {
      return res.status(404).json({
        status: "fail",
        message: "The stored payment proof could not be found",
      });
    }

    res.setHeader("Content-Type", order.paymentProof.mimeType);
    // Blocks MIME sniffing so the image can never be interpreted as script.
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Belt and braces: even if this route were ever mis-exposed, a strict
    // CSP + no-sniff prevents the bytes being executed in a browsing context.
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", "inline");

    return fs.createReadStream(absolute).pipe(res);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * GET /api/payments/verification   (admin only)
 * The admin "Payment Verification" queue, filterable by status.
 */
export const listVerifications = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admins only" });
    }

    const filter = {};

    if (req.query.status && req.query.status !== "all") {
      if (req.query.status === "pending") {
        // "Pending" in the admin UI means "proof submitted, awaiting review".
        filter.paymentStatus = "ProofSubmitted";
      } else {
        filter.paymentStatus = req.query.status;
      }
    } else if (req.query.status !== "all") {
      // Default view is the actionable queue.
      filter.paymentStatus = "ProofSubmitted";
    }

    const orders = await Order.find({
      ...filter,
      paymentMethod: "InstaPay",
    })
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({
      status: "success",
      count: orders.length,
      data: { orders },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * PATCH /api/payments/verification/:orderId   (admin only)
 * body: { action: "verify" | "reject", reason?: string }
 *
 * The admin decision is the single source of truth for payment verification.
 */
export const reviewPayment = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admins only" });
    }

    const { orderId } = req.params;
    const { action, reason } = req.body || {};

    if (action !== "verify" && action !== "reject") {
      return res.status(400).json({
        status: "fail",
        message: 'action must be "verify" or "reject"',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: "fail", message: "Order not found" });
    }

    if (order.paymentMethod !== "InstaPay") {
      return res.status(400).json({
        status: "fail",
        message: "This order does not use InstaPay",
      });
    }

    if (!order.paymentProof) {
      return res.status(409).json({
        status: "fail",
        message: "There is no payment proof to review for this order",
      });
    }

    if (action === "reject") {
      const cleanReason = (reason || "").trim().slice(0, 300);
      if (!cleanReason) {
        return res.status(400).json({
          status: "fail",
          message: "A rejection reason is required",
        });
      }

      order.paymentStatus = "Rejected";
      order.paymentReview = {
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        decision: "Rejected",
        rejectionReason: cleanReason,
      };
      order.orderStatus = "Placed";

      await order.save();
      await events.proofRejected(order, cleanReason);

      return res.status(200).json({
        status: "success",
        message: "Payment rejected",
        data: { orderNumber: order.orderNumber, paymentStatus: order.paymentStatus },
      });
    }

    order.paymentStatus = "Verified";
    order.paymentReview = {
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      decision: "Verified",
      rejectionReason: null,
    };
    // A verified payment is what allows the order to be dispatched; the
    // orderStatus itself is still driven by admin actions, so it is left alone.

    await order.save();
    await events.proofVerified(order, req.user.id);

    res.status(200).json({
      status: "success",
      message: "Payment verified",
      data: { orderNumber: order.orderNumber, paymentStatus: order.paymentStatus },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

/** Recognises multer's limit/rejection errors without importing multer here. */
function isMulterLimitError(error) {
  return (
    !!error &&
    (error.code === "LIMIT_FILE_SIZE" ||
      error.code === "LIMIT_UNEXPECTED_FILE" ||
      error.code === "LIMIT_FILE_COUNT")
  );
}
