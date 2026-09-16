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

    paymentMethod: { type: String, enum: ["Cash", "Card"], required: true },
    paymentStatus: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
    cardLastFour: { type: String },

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