// ⚠️ WARNING: This is a shim kept for backward-compat. Do NOT import this from client components. ⚠️
// Server-only re-exports:
export { getSessionIdFromCookies, readPrefs, writePrefs } from './session-prefs-server';
// Intentionally no client exports here.