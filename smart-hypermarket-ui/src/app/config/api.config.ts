/**
 * Central API origin resolution.
 *
 * The app must work in two very different situations:
 *
 *  1. Local development - the Angular dev server runs on :4200 while the API
 *     runs on :5000, so requests have to be sent to http://localhost:5000.
 *  2. Any public/deployed host (ngrok, a real domain, ...) - the API is served
 *     from the same origin as the app, so relative paths are the only thing
 *     that work. Hard-coding localhost there would make every visitor's browser
 *     call its *own* machine instead of the server.
 *
 * Detecting the hostname at runtime keeps a single build working in both cases
 * without environment files or a rebuild.
 */

const LOCAL_API_ORIGIN = 'http://localhost:5000';

function isLocalHost(): boolean {
  if (typeof window === 'undefined' || !window.location) {
    return true;
  }
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
}

/** Origin of the API server, e.g. `http://localhost:5000` or `` (same origin). */
export const API_ORIGIN = isLocalHost() ? LOCAL_API_ORIGIN : '';

/** Base URL for every REST endpoint, e.g. `http://localhost:5000/api` or `/api`. */
export const API_URL = `${API_ORIGIN}/api`;

/** Base URL for product imagery, e.g. `http://localhost:5000/uploads/` or `/uploads/`. */
export const UPLOADS_URL = `${API_ORIGIN}/uploads/`;
