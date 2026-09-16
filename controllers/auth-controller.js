import User from "../models/user.js";
import Order from "../models/order.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendResetPasswordEmail } from "../utils/send-email.js";

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

export const signup = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide name, email, password and phone",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        status: "fail",
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

   const user = await User.create({
  name,
  email,
  password: hashedPassword,
  phone,
  role: "customer",
});

    const token = generateToken(user);

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      token,
      data: {
      user: {
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  points: user.points,
},
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      status: "success",
      message: "Login successful",
      token,
      data: {
        user: {
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  points: user.points,
},
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};


export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide your email",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        status: "success",
        message: "If this email exists, a reset link has been sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await sendResetPasswordEmail(user.email, resetLink);

    res.status(200).json({
      status: "success",
      message: "If this email exists, a reset link has been sent",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};


export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide email, token and newPassword",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid or expired reset link",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};


export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "Admins only",
      });
    }

    const users = await User.find().select("-password").sort({ createdAt: -1 });

    const orderCounts = await Order.aggregate([
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);
    const countsMap = new Map(orderCounts.map((o) => [o._id.toString(), o.count]));

    const usersWithCounts = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      ordersCount: countsMap.get(u._id.toString()) || 0,
      createdAt: u.createdAt,
    }));

    res.status(200).json({
      status: "success",
      count: usersWithCounts.length,
      data: { users: usersWithCounts },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};