import express from "express";
import protect from "../middleware/auth-middleware.js";
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/order-controller.js";

const router = express.Router();

router.use(protect);

router.post("/", createOrder);
router.get("/mine", getMyOrders);
router.get("/", getAllOrders);
router.patch("/:id/status", updateOrderStatus);

export default router;