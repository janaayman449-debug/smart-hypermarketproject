import Wishlist from "../models/wishlist.js";

export const getWishlist = async (req, res) => {
  try {
    const items = await Wishlist.find({ user: req.user.id }).populate("product");

    res.status(200).json({
      status: "success",
      count: items.length,
      data: {
        items,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};


export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide productId",
      });
    }

    const existing = await Wishlist.findOne({ user: req.user.id, product: productId });
    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "Product already in wishlist",
        data: { item: existing },
      });
    }

    const item = await Wishlist.create({ user: req.user.id, product: productId });
    await item.populate("product");

    res.status(201).json({
      status: "success",
      data: { item },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    await Wishlist.findOneAndDelete({ user: req.user.id, product: productId });

    res.status(200).json({
      status: "success",
      message: "Removed from wishlist",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};