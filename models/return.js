import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderNumber: { type: String, required: true },
    customerName: { type: String, required: true },
    productName: { type: String, required: true },
    reason: { type: String, required: true },
    refundAmount: { type: Number, required: true },
    notes: { type: String },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Refunded"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const Return = mongoose.model("Return", returnSchema);

export default Return;