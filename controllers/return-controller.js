import Return from "../models/return.js";
import Order from "../models/order.js";

export const createReturnRequest = async (req, res) => {
  try {
    const { orderId, productName, reason, refundAmount, notes } = req.body;

    if (!orderId || !productName || !reason || refundAmount === undefined) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields",
      });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user.id });

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({
        status: "fail",
        message: "Only delivered orders are eligible for return",
      });
    }

    const daysSinceDelivery = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 3600 * 24);
    if (daysSinceDelivery > 14) {
      return res.status(400).json({
        status: "fail",
        message: "Return window has expired (14 days)",
      });
    }

    const returnRequest = await Return.create({
      order: order._id,
      user: req.user.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      productName,
      reason,
      refundAmount,
      notes,
      status: "Pending",
    });

    res.status(201).json({
      status: "success",
      data: { return: returnRequest },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getMyReturns = async (req, res) => {
  try {
    const returns = await Return.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: returns.length,
      data: { returns },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getAllReturns = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "Admins only",
      });
    }

    const returns = await Return.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: returns.length,
      data: { returns },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const updateReturnStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "Admins only",
      });
    }

    const { status } = req.body;
    const allowedStatuses = ["Pending", "Approved", "Rejected", "Refunded"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid status value",
      });
    }

    const returnRequest = await Return.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!returnRequest) {
      return res.status(404).json({
        status: "fail",
        message: "Return request not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { return: returnRequest },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};