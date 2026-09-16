import Message from "../models/message.js";

export const createMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide name, email, subject and message",
      });
    }

    const doc = await Message.create({ name, email, subject, message });

    res.status(201).json({
      status: "success",
      data: { message: doc },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getAllMessages = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "Admins only",
      });
    }

    const messages = await Message.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: messages.length,
      data: { messages },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "Admins only",
      });
    }

    const doc = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        status: "fail",
        message: "Message not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { message: doc },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};