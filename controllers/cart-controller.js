import Cart from "../models/cart.js";

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

export const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await cart.populate("items.product");

    res.status(200).json({
      status: "success",
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide productId",
      });
    }

    const cart = await getOrCreateCart(req.user.id);

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    await cart.populate("items.product");

    res.status(200).json({
      status: "success",
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 1) {
      return res.status(400).json({
        status: "fail",
        message: "Quantity must be at least 1",
      });
    }

    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.find((i) => i.product.toString() === productId);

    if (!item) {
      return res.status(404).json({
        status: "fail",
        message: "Item not found in cart",
      });
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate("items.product");

    res.status(200).json({
      status: "success",
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await getOrCreateCart(req.user.id);
    cart.items = cart.items.filter((i) => i.product.toString() !== productId);

    await cart.save();
    await cart.populate("items.product");

    res.status(200).json({
      status: "success",
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();

    res.status(200).json({
      status: "success",
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};