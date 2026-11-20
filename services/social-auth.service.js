import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { getSocialConfig } from "../config/social-auth.js";

/**
 * Server-side verification of social provider tokens.
 *
 * Nothing in this file trusts the frontend. The browser only ever sends an
 * opaque token; the identity (sub / user id, name, email) is read from the
 * token's own verified claims, or from a provider API called server-to-server.
 */

const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

/**
 * Verifies a Google ID token with Google's published public keys.
 *
 * OAuth2Client.verifyIdToken checks the RS256 signature, the audience (so a
 * token minted for a different app is rejected), and the expiry. We add the
 * issuer and email_verified checks that our own policy requires.
 */
export async function verifyGoogleIdToken(idToken) {
  const { google } = getSocialConfig();

  if (!google.clientId) {
    const error = new Error("Google login is not configured on this server");
    error.code = "PROVIDER_NOT_CONFIGURED";
    throw error;
  }

  if (typeof idToken !== "string" || !idToken.trim()) {
    const error = new Error("Missing Google credential");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  const client = new OAuth2Client(google.clientId, google.clientSecret);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: google.clientId,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    const error = new Error("Google token payload could not be read");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  if (!GOOGLE_ISSUERS.includes(payload.iss)) {
    const error = new Error("Untrusted Google token issuer");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  // Google only asserts an email is truly owned by the account holder when
  // this flag is set. Without it we must not treat the address as proof of
  // ownership, so it is refused rather than guessed at.
  if (payload.email_verified !== true) {
    const error = new Error("Google account email is not verified");
    error.code = "EMAIL_NOT_VERIFIED";
    throw error;
  }

  if (!payload.sub || !payload.email) {
    const error = new Error("Google token is missing a subject or email");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  return {
    // `sub` is the stable, provider-assigned identity. Never the email.
    providerUserId: payload.sub,
    email: String(payload.email).toLowerCase(),
    name: payload.name || (payload.email.split("@")[0] || "Customer"),
    avatar: payload.picture || null,
  };
}

/**
 * Verifies a Facebook user access token by asking Facebook about it.
 *
 * Step 1 calls /debug_token with our app access token. That proves the token
 * is valid AND was issued for OUR app, which is what stops a token stolen from
 * another site being replayed against us.
 *
 * Step 2 reads the profile from Facebook itself, so the name/email are the
 * provider's assertions rather than anything the browser claimed.
 */
export async function verifyFacebookAccessToken(accessToken) {
  const { facebook } = getSocialConfig();

  if (!facebook.appId || !facebook.appSecret) {
    const error = new Error("Facebook login is not configured on this server");
    error.code = "PROVIDER_NOT_CONFIGURED";
    throw error;
  }

  if (typeof accessToken !== "string" || !accessToken.trim()) {
    const error = new Error("Missing Facebook access token");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  const appAccessToken = facebook.appId + "|" + facebook.appSecret;

  const debugUrl =
    "https://graph.facebook.com/v21.0/debug_token" +
    "?input_token=" + encodeURIComponent(accessToken) +
    "&access_token=" + encodeURIComponent(appAccessToken);

  const debugRes = await fetch(debugUrl);
  if (!debugRes.ok) {
    const error = new Error("Facebook token could not be validated");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  const debugData = await debugRes.json();
  const info = debugData?.data;

  if (!info || info.is_valid !== true) {
    const error = new Error("Facebook access token is invalid or expired");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  if (String(info.app_id) !== String(facebook.appId)) {
    const error = new Error("Facebook token was issued for a different app");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  // The profile comes from Facebook, not from the client.
  const profileUrl =
    "https://graph.facebook.com/v21.0/me" +
    "?fields=id,name,email,picture.type(large)" +
    "&access_token=" + encodeURIComponent(accessToken);

  const profileRes = await fetch(profileUrl);
  if (!profileRes.ok) {
    const error = new Error("Facebook profile could not be read");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  const profile = await profileRes.json();

  if (!profile?.id) {
    const error = new Error("Facebook profile is missing a user id");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  // Facebook only returns an email if the user granted the email permission.
  // Its presence is provider-asserted, but it is not proof of ownership in the
  // way Google's email_verified is, so the linking rules treat it as weaker.
  return {
    providerUserId: String(profile.id),
    email: profile.email ? String(profile.email).toLowerCase() : null,
    name: profile.name || "Customer",
    avatar: profile.picture?.data?.url || null,
  };
}

/** Random, unguessable password for accounts that can only sign in socially. */
export function generateUnusablePassword() {
  return crypto.randomBytes(32).toString("hex");
}
