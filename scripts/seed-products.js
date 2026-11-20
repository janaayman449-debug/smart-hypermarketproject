import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "../config/db.js";
import Product from "../models/product-model.js";
import {
  getSeedProducts,
  validateSeedData,
} from "./data/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, "..", "backups");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const SKIP_BACKUP = args.has("--no-backup");

const normalize = (name) => String(name || "").trim().toLowerCase();

/**
 * Writes the current products collection to backups/ so the seed can always be
 * reversed by hand. This only reads, never writes to, the database itself.
 */
function backupExistingProducts(products) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUP_DIR, `products-backup-${stamp}.json`);

  fs.writeFileSync(file, JSON.stringify(products, null, 2), "utf8");
  return file;
}

async function run() {
  const problems = validateSeedData();
  if (problems.length > 0) {
    console.error("Seed data failed validation:");
    for (const problem of problems) console.error("  - " + problem);
    process.exit(1);
  }

  const seedProducts = getSeedProducts();

  await connectDB();

  const existing = await Product.find().lean();
  const existingNames = new Set(existing.map((p) => normalize(p.name)));

  const toInsert = seedProducts.filter(
    (p) => !existingNames.has(normalize(p.name))
  );
  const alreadyPresent = seedProducts.length - toInsert.length;

  console.log("");
  console.log("Products already in the database : " + existing.length);
  console.log("Products in the seed data set    : " + seedProducts.length);
  console.log("Already present (will be skipped): " + alreadyPresent);
  console.log("New products to insert           : " + toInsert.length);
  console.log("");

  if (!SKIP_BACKUP) {
    const backupFile = backupExistingProducts(existing);
    console.log("Backup written to: " + backupFile);
  }

  if (DRY_RUN) {
    console.log("");
    console.log("Dry run complete. No products were inserted.");
    return;
  }

  if (toInsert.length > 0) {
    await Product.insertMany(toInsert, { ordered: false });
    console.log("Inserted " + toInsert.length + " new products.");
  } else {
    console.log("Nothing to insert. The catalog is already up to date.");
  }

  const finalCount = await Product.countDocuments();
  console.log("Total products now in the database: " + finalCount);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("");
    console.error("Seed failed: " + (error?.message || "unknown error"));
    process.exit(1);
  });
