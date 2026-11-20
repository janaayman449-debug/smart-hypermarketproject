import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "../config/db.js";
import Product from "../models/product-model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const REPORT_FILE = path.join(ROOT, "backups", "image-fetch-report.json");

const USER_AGENT =
  "SmartHypermarketSeed/1.0 (educational demo; image sourcing)";

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const LIMIT = Number(argValue("--limit", "0")) || 0;
const OFFSET = Number(argValue("--offset", "0")) || 0;
const DRY_RUN = args.includes("--dry-run");
const TEXT_SEARCH = args.includes("--text-search");
const RESET = args.includes("--reset");
const MIN_SCORE = Number(argValue("--min-score", "0.75"));
const CATEGORY = argValue("--category", null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Catalog routing. Food products come from Open Food Facts; personal care from
// Open Beauty Facts; household/cleaning from Open Products Facts. All three
// share the same JSON API shape.
// ---------------------------------------------------------------------------
function catalogFor(category) {
  if (category === "Personal Care") return "world.openbeautyfacts.org";
  if (category === "Household & Cleaning") return "world.openproductsfacts.org";
  return "world.openfoodfacts.org";
}

// Known brands in the seed catalogue. Longest match wins so "El Doha" is not
// confused with "El".
const BRANDS = [
  "Head & Shoulders", "Johnson's", "Chicken of the Sea", "Mr. Muscle", "Mr. Clean",
  "Air Wick", "San Pellegrino", "California Garden", "Tropicana", "Power Horse",
  "Sun Top", "Bake Rolls", "Bisco Misr", "Five Stars", "El Maleka", "El Ekhlas",
  "El Qaleya", "El Sa'aa", "El Doha", "El Arosa", "El Falah", "El Marwa", "El Safi",
  "Abu Auf", "Rich Bake", "Sun Mall", "Farm Frites", "Green Giant", "Goody",
  "Hellmann's", "Coca-Cola", "Red Bull", "Rani", "Fayrouz", "Lipton", "Nescafe",
  "Jacobs", "Lavazza", "Baraka", "Dasani", "Aquafina", "Evian", "Perrier",
  "Juhayna", "Almarai", "Nada", "Beyti", "Lactel", "Loya", "Nido", "Anchor",
  "Nesquik", "Activia", "Domty", "Panda", "Kiri", "Philadelphia", "President",
  "Puck", "Kraft", "Arab Dairy", "Lurpak", "Nefertiti", "Labanita", "Nestle",
  "Rainbow", "Americana", "Pepsi", "Sprite", "Fanta", "Mirinda", "7UP", "Monster",
  "Sting", "Royal", "Sun", "Regina", "Italiano", "Barilla", "Indomie", "Crystal",
  "Areej", "Alfa", "Quaker", "Kellogg's", "Nutella", "Dabur", "Skippy", "Heinz",
  "Vitrac", "Tabasco", "Maggi", "Knorr", "Chipsy", "Doritos", "Lay's", "Bugles",
  "Cheetos", "Pringles", "Sensations", "Tiger", "Galaxy", "Kit Kat", "Snickers",
  "Twix", "Mars", "M&M's", "Kinder", "Cadbury", "Lindt", "Toblerone", "Ferrero",
  "Milky Way", "Bounty", "Oreo", "McVitie's", "Loacker", "Ulker", "Tuc", "Atyab",
  "Halwani", "McCain", "Persil", "Tide", "Ariel", "Omo", "Downy", "Comfort",
  "Softlan", "Clorox", "Domestos", "Harpic", "Dettol", "Lifebuoy", "Pril", "Fairy",
  "Dawn", "Palmolive", "Finish", "Vim", "Cif", "Flash", "Pledge", "Windex", "Glade",
  "Baygon", "Raid", "Combat", "Bref", "Scotch-Brite", "Vileda", "Glad", "Fine",
  "Kleenex", "Pantene", "Dove", "Garnier", "Sunsilk", "Clear", "Tresemme", "Nivea",
  "Axe", "Pond's", "Olay", "Colgate", "Sensodyne", "Signal", "Oral-B", "Listerine",
  "Rexona", "Gillette", "Venus", "Always", "Whisper",
].sort((a, b) => b.length - a.length);

const SIZE_RE =
  /\b\d+(\.\d+)?\s?(l|ml|g|kg|gm|p|pc|pcs|pack|pieces|piece|count|x\d+|\d+x)\b/gi;

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectBrand(name) {
  const lower = normalize(name);
  for (const brand of BRANDS) {
    const b = normalize(brand);
    if (lower === b || lower.startsWith(b + " ") || lower.includes(" " + b + " ")) {
      return brand;
    }
  }
  return null;
}

function tokenize(text) {
  return normalize(text)
    .replace(SIZE_RE, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length >= 2);
}

function brandSlug(brand) {
  return normalize(brand).replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// HTTP with retry/backoff for the very common 503/429 from the open catalogs.
// ---------------------------------------------------------------------------
async function getJson(url, tries = 2) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.status === 503 || res.status === 429) {
        if (attempt < tries) await sleep(1500 * attempt + Math.random() * 600);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      if (attempt < tries) await sleep(1500 * attempt);
    }
  }
  return null;
}

const SEARCH_FIELDS = "product_name,brands,image_front_url,image_url";

// The same brand is reused by many products, so each catalogue is queried once
// per (domain, brand) and the candidate list is shared.
const brandCache = new Map();
const textCache = new Map();

async function searchBrand(domain, brand) {
  const key = domain + "|" + brandSlug(brand);
  if (brandCache.has(key)) return brandCache.get(key);

  const url =
    `https://${domain}/api/v2/search?brands_tags=${encodeURIComponent(brandSlug(brand))}` +
    `&fields=${SEARCH_FIELDS}&page_size=25`;
  const json = await getJson(url);
  const list = json?.products || json?.hits || [];
  brandCache.set(key, list);
  await sleep(500 + Math.random() * 400);
  return list;
}

async function searchText(domain, query) {
  const key = domain + "|" + query;
  if (textCache.has(key)) return textCache.get(key);

  const url =
    `https://${domain}/api/v2/search?q=${encodeURIComponent(query)}` +
    `&fields=${SEARCH_FIELDS}&page_size=10`;
  const json = await getJson(url, 1);
  const list = json?.products || json?.hits || [];
  textCache.set(key, list);
  await sleep(500 + Math.random() * 400);
  return list;
}

function imageOf(p) {
  return p?.image_front_url || p?.image_url || null;
}

// Confidence score: brand presence PLUS agreement on the distinctive
// (non-brand, non-size) words. 0 means "no confident match". Matching is
// deliberately strict because a wrong image is worse than no image.
const GENERIC_TOKENS = new Set([
  "milk", "cream", "juice", "water", "tea", "coffee", "oil", "rice", "bread",
  "toast", "loaf", "buns", "bun", "rolls", "roll", "bagel", "bagels",
  "powder", "can", "cans", "bottle", "pack", "bag", "box", "tin",
  "drink", "drinks", "soda", "cola", "original", "originals", "classic",
  "bar", "bars", "chips", "slice", "slices", "crisp", "crisps", "snack",
  "biscuits", "biscuit", "cake", "soup", "mixed", "fresh", "natural",
  "detergent", "cleaning", "liquid", "gel", "shampoo", "soap", "wash",
  "toothpaste", "tissue", "tissues", "towel", "towels", "wipes",
]);

function score(candidate, brand, distinctive) {
  const candName = tokenize(candidate.product_name || "");
  const candBrand = normalize(candidate.brands || "");
  const wantBrand = brand ? normalize(brand) : "";
  const brandMatch = wantBrand
    ? candBrand.includes(wantBrand) ||
      normalize(candidate.product_name || "").includes(wantBrand)
    : false;

  if (!brandMatch) return 0;

  const candSet = new Set(candName);
  const specific = distinctive.filter((t) => !GENERIC_TOKENS.has(t));
  const specificPresent = specific.filter((t) => candSet.has(t));
  const anyPresent = distinctive.filter((t) => candSet.has(t));

  // No distinctive words at all (e.g. "Almarai Mixed Fruit Juice"): accept a
  // brand match only if the catalogue entry shares at least one word.
  if (specific.length === 0) return anyPresent.length >= 1 ? 0.6 : 0;

  const ratio = specificPresent.length / specific.length;
  if (ratio < 0.5) return 0;
  return 0.5 + 0.5 * ratio;
}

async function pickImage(domain, name) {
  const brand = detectBrand(name);
  const allTokens = tokenize(name);
  const brandTokens = brand ? new Set(tokenize(brand)) : new Set();
  const distinctive = allTokens.filter((t) => !brandTokens.has(t));

  const candidates = [];

  if (brand) {
    const branded = await searchBrand(domain, brand);
    for (const c of branded) if (imageOf(c)) candidates.push(c);
  }

  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const s = score(c, brand, distinctive);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }

  // The full-text search endpoint is heavily rate-limited (frequent 503s) and
  // often returns nothing, so it is opt-in.
  if (TEXT_SEARCH && (!best || bestScore < MIN_SCORE)) {
    const q = [brand, ...distinctive.slice(0, 3)].filter(Boolean).join(" ");
    const text = await searchText(domain, q);
    for (const c of text) {
      if (!imageOf(c)) continue;
      const s = score(c, brand, distinctive);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
  }

  if (!best || bestScore < MIN_SCORE) return null;
  return { image: imageOf(best), matchedName: best.product_name, matchedBrand: best.brands, score: bestScore };
}

function extensionFor(contentType, url) {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  const m = url?.match(/\.(jpe?g|png|webp)(?:\?|$)/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

function slug(text) {
  return normalize(text).replace(/\s+/g, "-").slice(0, 60);
}

async function downloadImage(url, baseName) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.status === 503 || res.status === 429) {
        await sleep(2500 * attempt);
        continue;
      }
      if (!res.ok) return null;
      const ct = res.headers.get("content-type") || "";
      if (!ct.startsWith("image/")) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1500) return null;
      const ext = extensionFor(ct, url);
      const file = `${baseName}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
      return file;
    } catch {
      await sleep(2000 * attempt);
    }
  }
  return null;
}

async function run() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });

  await connectDB();

  if (RESET) {
    const seeded = await Product.find({ image: /^seed-/ }).lean();
    let removedFiles = 0;
    for (const p of seeded) {
      const f = path.join(UPLOAD_DIR, p.image);
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
        removedFiles += 1;
      }
    }
    await Product.updateMany({ image: /^seed-/ }, { $set: { image: null } });
    console.log(`RESET: cleared ${seeded.length} product(s), deleted ${removedFiles} file(s).`);
    if (DRY_RUN) {
      console.log("DRY RUN: stopping before fetch.");
      return;
    }
  }

  const query = { $or: [{ image: null }, { image: { $exists: false } }, { image: "" }] };
  if (CATEGORY) query.category = CATEGORY;
  let products = await Product.find(query).sort({ category: 1, name: 1 }).lean();

  if (OFFSET) products = products.slice(OFFSET);
  if (LIMIT) products = products.slice(0, LIMIT);

  console.log(`Products without an image to process: ${products.length}`);
  if (DRY_RUN) console.log("DRY RUN: no files or records will be changed.");

  const report = [];
  let matched = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    const domain = catalogFor(p.category);
    let result = null;

    try {
      result = await pickImage(domain, p.name);
    } catch (err) {
      result = null;
    }

    if (!result) {
      skipped += 1;
      report.push({ id: String(p._id), name: p.name, category: p.category, status: "no-match" });
      console.log(`[${i + 1}/${products.length}] MISS  ${p.name}`);
      continue;
    }

    if (DRY_RUN) {
      matched += 1;
      report.push({
        id: String(p._id), name: p.name, category: p.category, status: "dry-match",
        matchedName: result.matchedName, matchedBrand: result.matchedBrand,
        score: Number(result.score.toFixed(2)), image: result.image,
      });
      console.log(`[${i + 1}/${products.length}] DRY   ${p.name}  <=  ${result.matchedName} (${result.score.toFixed(2)})`);
      continue;
    }

    const saved = await downloadImage(result.image, `seed-${slug(p.name)}-${String(p._id).slice(-6)}`);
    if (!saved) {
      skipped += 1;
      report.push({
        id: String(p._id), name: p.name, category: p.category, status: "download-failed",
        matchedName: result.matchedName, image: result.image,
      });
      console.log(`[${i + 1}/${products.length}] DLFAIL ${p.name}`);
      continue;
    }

    await Product.updateOne({ _id: p._id }, { $set: { image: saved } });
    matched += 1;
    report.push({
      id: String(p._id), name: p.name, category: p.category, status: "matched",
      matchedName: result.matchedName, matchedBrand: result.matchedBrand,
      score: Number(result.score.toFixed(2)), file: saved, source: result.image,
    });
    console.log(`[${i + 1}/${products.length}] OK    ${p.name}  <=  ${result.matchedName} (${result.score.toFixed(2)})`);

    await sleep(400 + Math.random() * 300);
  }

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");
  console.log("");
  console.log(`Matched: ${matched} | Skipped: ${skipped} | Report: ${REPORT_FILE}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Image fetch failed:", err?.message || err);
    process.exit(1);
  });
