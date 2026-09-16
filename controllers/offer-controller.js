import Offer from "../models/offer.js";

export const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ active: true }).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: offers.length,
      data: { offers },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

export const getAllOffersAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admins only" });
    }

    const offers = await Offer.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: offers.length,
      data: { offers },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

export const createOffer = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admins only" });
    }

    const { code, title, description, discountType, discountValue, minSpend, expiresAt } = req.body;

    if (!code || !title || !description || !discountValue) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide code, title, description and discountValue",
      });
    }

    const existing = await Offer.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ status: "fail", message: "Offer code already exists" });
    }

    const offer = await Offer.create({
      code,
      title,
      description,
      discountType,
      discountValue,
      minSpend,
      expiresAt,
    });

    res.status(201).json({
      status: "success",
      data: { offer },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

export const updateOffer = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admins only" });
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!offer) {
      return res.status(404).json({ status: "fail", message: "Offer not found" });
    }

    res.status(200).json({
      status: "success",
      data: { offer },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admins only" });
    }

    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({ status: "fail", message: "Offer not found" });
    }

    res.status(200).json({
      status: "success",
      message: "Offer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.params;

    const offer = await Offer.findOne({ code: code.toUpperCase(), active: true });

    if (!offer) {
      return res.status(404).json({ status: "fail", message: "Invalid or inactive coupon code" });
    }

    if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
      return res.status(400).json({ status: "fail", message: "This coupon has expired" });
    }

    res.status(200).json({
      status: "success",
      data: { offer },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};