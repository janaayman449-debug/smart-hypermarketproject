import Order from "../models/order.js";
import Cart from "../models/cart.js";
import User from "../models/user.js";

function generateOrderNumber() {
  return "SH-" + Math.floor(10000 + Math.random() * 89999);
}

export const createOrder = async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      deliveryCity,
      deliverySlot,
      deliveryNotes,
      subtotal,
      categoryDiscountTotal,
      couponCode,
      couponDiscountTotal,
      pointsRedeemed,
      pointsDiscountTotal,
      deliveryFee,
      grandTotal,
      paymentMethod,
      paymentStatus,
      cardLastFour,
    } = req.body;

    if (!customerName || !customerEmail || !customerPhone || !deliveryAddress || !deliveryCity) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required customer/delivery fields",
      });
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Your cart is empty",
      });
    }

 const validCartItems = cart.items.filter((i) => i.product);

if (validCartItems.length === 0) {
  return res.status(400).json({
    status: "fail",
    message: "No valid products in cart",
  });
}

for (const item of validCartItems) {
  if (item.quantity > item.product.stock) {
    return res.status(400).json({
      status: "fail",
      message: `Not enough stock for ${item.product.name}`,
    });
  }
}

const orderItems = validCartItems.map((i) => ({
  product: i.product._id,
  name: i.product.name,
  image: i.product.image,
  price: i.product.price,
  quantity: i.quantity,
}));
 const order = await Order.create({
  orderNumber: generateOrderNumber(),
  user: req.user.id,
  customerName,
  customerEmail,
  customerPhone,
  deliveryAddress,
  deliveryCity,
  deliverySlot,
  deliveryNotes,
  items: orderItems,
  subtotal,
  categoryDiscountTotal,
  couponCode,
  couponDiscountTotal,
  pointsRedeemed,
  pointsDiscountTotal,
  deliveryFee,
  grandTotal,
  paymentMethod,
  paymentStatus,
  cardLastFour,
  orderStatus: "Placed",
});

for (const item of validCartItems) {
  item.product.stock -= item.quantity;
  await item.product.save();
}

cart.items = [];
await cart.save();

    res.status(201).json({
      status: "success",
      data: { order },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: orders.length,
      data: { orders },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "Admins only",
      });
    }

    const orders = await Order.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: orders.length,
      data: { orders },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "Admins only",
      });
    }

    const { status } = req.body;
    const allowedStatuses = ["Placed", "OutForDelivery", "Delivered", "Cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid status value",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found",
      });
    }

    if (status === "Delivered") {
      const user = await User.findById(order.user);

      if (user) {
        const earnedPoints = Math.floor(order.grandTotal / 10);
        user.points += earnedPoints;
        await user.save();
      }
    }

    res.status(200).json({
      status: "success",
      data: { order },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};