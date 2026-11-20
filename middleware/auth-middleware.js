import jwt from "jsonwebtoken";

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization; 

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "fail",
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      status: "fail",
      message: "Invalid or expired token",
    });
  }
};

export default protect;

/**
 * Requires an authenticated user whose role is in `roles`.
 *
 * Must be mounted AFTER `protect`, since it relies on req.user being the
 * decoded token payload. This exists because a bare JWT check is not enough:
 * a valid customer token must never be able to read another customer's payment
 * proof or approve a payment.
 */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "No token provided",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };

export const adminOnly = requireRole("admin");
