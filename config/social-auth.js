/**
 * Social login configuration.
 *
 * Secrets live ONLY in .env and are never sent to the browser. The frontend
 * only ever receives the public client/app id, which is not a secret.
 *
 * Expected .env keys:
 *   GOOGLE_CLIENT_ID       - from Google Cloud Console -> APIs & Services -> Credentials
 *   GOOGLE_CLIENT_SECRET   - same screen, client secret
 *   FACEBOOK_APP_ID        - from Meta for Developers -> App settings -> Basic
 *   FACEBOOK_APP_SECRET    - same screen, App secret
 *
 * As with config/instapay.js, everything is read lazily at call time: in ESM
 * all imports are evaluated before the module body of index.js runs
 * dotenv.config(), so reading process.env at module scope would capture
 * undefined forever.
 */

const PLACEHOLDER = "";

function env(key) {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : PLACEHOLDER;
}

export function getSocialConfig() {
  return {
    google: {
      clientId: env("GOOGLE_CLIENT_ID"),
      clientSecret: env("GOOGLE_CLIENT_SECRET"),
    },
    facebook: {
      appId: env("FACEBOOK_APP_ID"),
      appSecret: env("FACEBOOK_APP_SECRET"),
    },
  };
}

export function isGoogleConfigured() {
  const { google } = getSocialConfig();
  return Boolean(google.clientId);
}

export function isFacebookConfigured() {
  const { facebook } = getSocialConfig();
  return Boolean(facebook.appId && facebook.appSecret);
}

/**
 * Public, non-secret values the browser needs. The client secret is
 * deliberately excluded - it must never reach the frontend.
 */
export function getPublicSocialConfig() {
  const { google, facebook } = getSocialConfig();
  return {
    googleClientId: google.clientId,
    facebookAppId: facebook.appId,
    googleEnabled: Boolean(google.clientId),
    facebookEnabled: isFacebookConfigured(),
  };
}
