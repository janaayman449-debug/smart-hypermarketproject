import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

/**
 * Secure upload middleware for InstaPay payment-proof screenshots.
 *
 * This is deliberately NOT the same as middleware/upload.js. That one is for
 * public product imagery and trusts the client's filename + MIME type, which is
 * acceptable for a catalogue image but not for a payment document.
 *
 * Differences, and why:
 *
 *  1. memoryStorage - the bytes are validated BEFORE anything touches the
 *     disk, so an invalid or hostile file is never written at all.
 *  2. Magic-byte sniffing - the real image type is read from the file's own
 *     signature. The declared Content-Type and the filename are both ignored,
 *     so renaming `payload.php` to `proof.jpg` (or lying about the MIME type)
 *     cannot get it through.
 *  3. Private directory - stored outside the publicly served `uploads/` folder.
 *     Files are only reachable via an authenticated admin route.
 *  4. Server-generated name - crypto.randomUUID() plus an extension derived
 *     from the *detected* type. User input never reaches the path, which also
 *     removes path traversal and double-extension tricks.
 */

export const PAYMENT_PROOF_DIR = "private-uploads/payment-proofs";

/** 4 MB. A full-page phone screenshot is typically 1-3 MB. */
export const MAX_PROOF_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_PROOF_FORMATS = ["image/jpeg", "image/png", "image/webp"];

/** Human readable list used in API error responses. */
const FORMAT_LABEL = "JPG, PNG or WEBP";

/**
 * Detects an image type from its leading bytes.
 * Returns the canonical MIME type + extension, or null if unrecognised.
 */
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: ".jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", ext: ".png" };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: ".webp" };
  }

  return null;
}

/** Creates the private directory tree. Called once at server start-up. */
export function ensureProofDir() {
  fs.mkdirSync(PAYMENT_PROOF_DIR, { recursive: true });
  return path.resolve(PAYMENT_PROOF_DIR);
}

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // A cheap early rejection. The authoritative check is `detectImageType`
  // against the actual bytes in the controller - a declared type proves
  // nothing, so this is only an early exit, never the decision.
  if (!ACCEPTED_PROOF_FORMATS.includes(file.mimetype)) {
    return cb(
      new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only " + FORMAT_LABEL + " images are accepted")
    );
  }
  cb(null, true);
};

const uploadProof = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_PROOF_BYTES,
    files: 1, // exactly one screenshot per request
  },
});

/**
 * Validates the uploaded buffer and writes it to the private directory.
 * Returns { fileName, mimeType, size, originalName } or throws.
 */
export function persistProof(file) {
  const detected = detectImageType(file.buffer);

  if (!detected) {
    const err = new Error(
      "The uploaded file is not a valid " + FORMAT_LABEL + " image. Its contents do not match any supported image format."
    );
    err.status = 415;
    throw err;
  }

  if (file.buffer.length > MAX_PROOF_BYTES) {
    const err = new Error("The uploaded image is larger than the 4 MB limit.");
    err.status = 413;
    throw err;
  }

  // Name is generated from scratch; the extension comes from the detected
  // type. No part of the client's filename is used.
  const fileName = crypto.randomUUID() + detected.ext;
  const target = path.join(PAYMENT_PROOF_DIR, fileName);

  fs.writeFileSync(target, file.buffer);

  return {
    fileName,
    mimeType: detected.mime,
    size: file.buffer.length,
    // Display-only, sanitised to a bare filename for display purposes.
    originalName: path.basename(file.originalname || "proof").slice(0, 120),
  };
}

/** Resolves a stored proof to an absolute path, refusing anything odd. */
export function resolveProofPath(fileName) {
  if (!fileName) return null;
  // Defensive: the name is server-generated, but never let a stored value
  // escape the directory if the DB were ever tampered with.
  const base = path.basename(fileName);
  if (base !== fileName) return null;
  const full = path.resolve(PAYMENT_PROOF_DIR, base);
  if (path.dirname(full) !== path.resolve(PAYMENT_PROOF_DIR)) return null;
  return full;
}

export default uploadProof;
