import mongoose from "mongoose";
import dns from "dns";

const DEFAULT_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 4000;

/**
 * mongodb+srv:// URIs are resolved with an SRV DNS lookup, and some networks
 * refuse SRV queries against the OS resolver. DNS_SERVERS in .env lets a
 * deployment point at a working resolver; we fall back to public DNS.
 */
function applyDnsServers() {
  const configured = (process.env.DNS_SERVERS || "")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  const servers = configured.length > 0 ? configured : DEFAULT_DNS_SERVERS;
  try {
    dns.setServers(servers);
  } catch {
    // An unusable resolver should not stop the app from booting; the OS
    // resolver is a reasonable fallback.
  }
  return servers;
}

/**
 * MongooseServerSelectionError.message is always the same generic Atlas hint,
 * which hides the actual cause. The real error sits one level down, on the
 * per-server description. Pull it out so the log is actually useful.
 */
function extractCause(error) {
  const servers = error?.reason?.servers;
  if (servers && typeof servers.values === "function") {
    for (const server of servers.values()) {
      const inner = Array.isArray(server.error) ? server.error[0] : server.error;
      if (inner) {
        return {
          address: server.address,
          name: inner.name,
          code: inner.code,
          message: inner.message,
        };
      }
    }
  }
  return { address: null, name: error?.name, code: error?.code, message: error?.message };
}

function advise(cause) {
  const text = [cause.message, cause.code, cause.name].filter(Boolean).join(" ");

  if (/TLS|SSL|ssl3|handshake|EPROTO|ECONNRESET|ECONNABORTED/i.test(text)) {
    return [
      "Atlas refused the TLS handshake. On MongoDB Atlas this almost always",
      "means your PUBLIC IP address is not in the cluster's IP Access List -",
      "Atlas drops unlisted clients at the TLS layer, before authentication.",
      "",
      "Fix in the Atlas UI:",
      "  Network Access -> IP Access List -> Add IP Address",
      "  -> 'Add my current IP address'  (or allow 0.0.0.0/0 for dev only)",
    ];
  }

  if (/Authentication failed|not authorized|invalid credentials|Unauthorized/i.test(text)) {
    return [
      "Atlas rejected the database credentials.",
      "",
      "Fix: Atlas UI -> Database Access -> edit the user, confirm the",
      "username and password match the MONGODB_URI in .env exactly.",
    ];
  }

  if (/ENOTFOUND|EAI_AGAIN|SERVFAIL|ECONNREFUSED/i.test(text)) {
    return [
      "Could not resolve the database hostname.",
      "",
      "Fix: confirm MONGODB_URI is correct and that DNS can resolve it.",
      "DNS_SERVERS in .env can point at a working resolver if needed.",
    ];
  }

  return ["Check MONGODB_URI, DB_NAME and the Atlas cluster status."];
}

function reportFailure(error) {
  const cause = extractCause(error);

  console.error("\nMongoDB connection failed\n");
  console.error("  error    :", cause.name || "UnknownError");
  if (cause.code) console.error("  code     :", cause.code);
  if (cause.address) console.error("  server   :", cause.address);
  console.error("  detail   :", cause.message || "none reported");
  console.error("");
  for (const line of advise(cause)) console.error("  " + line);
  console.error("");
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves once MongoDB is usable, and rejects (after retries) if it is not.
 *
 * It deliberately does NOT call process.exit(): the caller decides the startup
 * order, and the server must not start listening until the database is
 * actually reachable. Serving requests against a dead connection is what
 * surfaces to the frontend as a data connection failure.
 */
const connectDB = async () => {
  const servers = applyDnsServers();

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from .env - cannot connect to MongoDB.");
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        dbName: process.env.DB_NAME,
        serverSelectionTimeoutMS: 10000,
      });
      console.log(
        "MongoDB connected successfully to " +
          mongoose.connection.name +
          " (dns: " + servers.join(", ") + ")"
      );
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      const isLast = attempt === MAX_ATTEMPTS;
      console.warn("MongoDB connection attempt " + attempt + "/" + MAX_ATTEMPTS + " failed.");
      if (!isLast) await wait(RETRY_DELAY_MS);
    }
  }

  reportFailure(lastError);
  throw lastError;
};

export default connectDB;
