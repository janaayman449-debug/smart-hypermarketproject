import express from "express";
import protect from "../middleware/auth-middleware.js";
import {
  createReturnRequest,
  getMyReturns,
  getAllReturns,
  updateReturnStatus,
} from "../controllers/return-controller.js";

const router = express.Router();

router.use(protect);

router.post("/", createReturnRequest);
router.get("/mine", getMyReturns);
router.get("/", getAllReturns);
router.patch("/:id/status", updateReturnStatus);

export default router;