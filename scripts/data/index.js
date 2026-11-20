import freshProduce from "./fresh-produce.js";
import dairyEggs from "./dairy-eggs.js";
import bakery from "./bakery.js";
import beverages from "./beverages.js";
import pantryGrains from "./pantry-grains.js";
import snacks from "./snacks.js";
import frozenFoods from "./frozen-foods.js";
import meatPoultry from "./meat-poultry.js";
import householdCleaning from "./household-cleaning.js";
import personalCare from "./personal-care.js";

export const EXPECTED_COUNT = 600;

const products = [
  ...freshProduce,
  ...dairyEggs,
  ...bakery,
  ...beverages,
  ...pantryGrains,
  ...snacks,
  ...frozenFoods,
  ...meatPoultry,
  ...householdCleaning,
  ...personalCare,
];

export function getSeedProducts() {
  return products;
}

export function validateSeedData() {
  const problems = [];

  if (products.length !== EXPECTED_COUNT) {
    problems.push(
      `Expected ${EXPECTED_COUNT} products but the data set contains ${products.length}.`
    );
  }

  const seen = new Map();
  for (const product of products) {
    const key = product.name.trim().toLowerCase();

    if (seen.has(key)) {
      problems.push(`Duplicate product name in seed data: "${product.name}".`);
      continue;
    }
    seen.set(key, product);

    if (!product.name || !product.description || !product.category) {
      problems.push(`Product "${product.name}" is missing required text fields.`);
    }
    if (typeof product.price !== "number" || product.price < 0) {
      problems.push(`Product "${product.name}" has an invalid price.`);
    }
    if (typeof product.stock !== "number" || product.stock < 0) {
      problems.push(`Product "${product.name}" has an invalid stock value.`);
    }
  }

  return problems;
}
