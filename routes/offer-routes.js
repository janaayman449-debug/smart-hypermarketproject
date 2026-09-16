import express from "express";
import {
  getAllOffers,
  getAllOffersAdmin,
  createOffer,
  updateOffer,
  deleteOffer,
  validateCoupon,
} from "../controllers/offer-controller.js";
import protect from "../middleware/auth-middleware.js";

const router = express.Router();

router.get("/", getAllOffers);
router.get("/admin", protect, getAllOffersAdmin);
router.get("/validate/:code", validateCoupon);
router.post("/", protect, createOffer);
router.patch("/:id", protect, updateOffer);
router.delete("/:id", protect, deleteOffer);

export default router;