import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import Product from "../models/product-model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "ml", "products.csv");

await connectDB();
const products = await Product.find().lean();

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\s+/g, " ")}"`;

const header = ["product_id", "name", "category", "price", "stock",
                "description_length", "has_image", "created_at"];

const rows = products.map((p) => [
  p._id, p.name, p.category, p.price, p.stock,
  (p.description || "").length,
  p.image ? 1 : 0,
  p.createdAt.toISOString(),
].map(esc).join(","));

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, [header.join(","), ...rows].join("\n"), "utf-8");
console.log("Exported", products.length, "products to", outPath);
process.exit(0);