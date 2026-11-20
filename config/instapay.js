/**
 * InstaPay payment settings.
 *
 * The receiving account details are configuration, not UI copy, so they live
 * here and are served to the checkout over an API endpoint. Nothing sensitive
 * is hardcoded in a component. Values come from the environment with clearly
 * marked placeholders, so a deployment configures them in .env and the UI never
 * needs a code change.
 *
 * Expected .env keys (add to your .env file):
 *   INSTAPAY_ACCOUNT_NAME    - name shown to the customer
 *   INSTAPAY_ACCOUNT_ID      - the InstaPay handle / wallet id
 *   INSTAPAY_ACCOUNT_NUMBER  - the linked bank account number
 *   INSTAPAY_BANK_NAME       - the bank the account is held at
 *
 * IMPORTANT - why everything below reads process.env lazily:
 * In ESM, all `import` statements are hoisted and evaluated BEFORE any
 * statement in the importing module's body. index.js calls `dotenv.config()`
 * in its body, so by the time this module is first evaluated, .env has NOT
 * been loaded yet. Reading process.env at module top level would therefore
 * capture empty strings permanently, and the account would appear
 * unconfigured no matter what was in .env.
 *
 * config/db.js avoids this by reading process.env inside the async function it
 * exports, which only runs after dotenv.config(). Every read here is done the
 * same way: at call time, never at module load time.
 */

const PLACEHOLDER = "";

/** Reads one env var at call time, never cached at module load. */
function env(key) {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : PLACEHOLDER;
}

export function getInstapaySettings() {
  return {
    accountName: env("INSTAPAY_ACCOUNT_NAME"),
    accountId: env("INSTAPAY_ACCOUNT_ID"),
    accountNumber: env("INSTAPAY_ACCOUNT_NUMBER"),
    bankName: env("INSTAPAY_BANK_NAME"),
  };
}

/**
 * True when a real receiving account has been configured. The checkout uses
 * this to warn the operator (and block submission) rather than silently
 * showing an empty account the customer cannot pay to.
 */
export function isInstapayConfigured() {
  const s = getInstapaySettings();
  return Boolean(s.accountId || s.accountNumber);
}

/** The payload the checkout renders. Copy-friendly, ordered for display. */
export function getInstapayPublicInfo() {
  const s = getInstapaySettings();
  return {
    method: "InstaPay",
    accountName: s.accountName,
    accountId: s.accountId,
    accountNumber: s.accountNumber,
    bankName: s.bankName,
    configured: isInstapayConfigured(),
  };
}

/**
 * A single plain-text block for the "copy payment details" button.
 * Only includes fields that are actually configured.
 */
export function buildInstapayCopyText() {
  const s = getInstapaySettings();
  const lines = [];
  if (s.accountName) lines.push(s.accountName);
  if (s.bankName) lines.push(s.bankName);
  if (s.accountNumber) lines.push("Account: " + s.accountNumber);
  if (s.accountId) lines.push("InstaPay: " + s.accountId);
  return lines.join("\n");
}
