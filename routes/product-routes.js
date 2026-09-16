import express from "express";

import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/product-controller.js";

import upload from "../middleware/upload.js";
import protect from "../middleware/auth-middleware.js";

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      status: "fail",
      message: "Admins only",
    });
  }

  next();
};

// Public routes
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Admin only CRUD
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("image"),
  createProduct
);

router.patch(
  "/:id",
  protect,
  adminOnly,
  upload.single("image"),
  updateProduct
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteProduct
);

export default router;