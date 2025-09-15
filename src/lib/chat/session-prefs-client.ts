// Client-only (no next/headers). No React, no 'use client' needed.
const SID_KEY = 'briki.sessionId';
const CAT_KEY = 'briki.activeCategory';
const COUNTRY_KEY = 'briki.country';
const ONE_YEAR = 60 * 60 * 24 * 365;

function readCookie(name: string) {
  if (typeof document === 'undefined') return '';
  return document.cookie.split('; ').find(c => c.startsWith(name + '='))?.split('=')[1] ?? '';
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
}

function genId() {
  return (globalThis.crypto?.randomUUID?.() ?? `sid_${Math.random().toString(36).slice(2)}${Date.now()}`);
}

export function getOrCreateSessionId() {
  if (typeof window === 'undefined') return 'sid-ssr';
  let v = readCookie(SID_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(SID_KEY) || '' : '');
  if (!v) {
    v = genId();
    writeCookie(SID_KEY, v);
    try {
      localStorage?.setItem(SID_KEY, v);
    } catch {}
  }
  return v;
}

export function getActiveCategory() {
  try {
    return localStorage?.getItem(CAT_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveCategory(v: string) {
  try {
    localStorage?.setItem(CAT_KEY, v);
  } catch {}
}

export function getCountry() {
  try {
    return localStorage?.getItem(COUNTRY_KEY) || null;
  } catch {
    return null;
  }
}

export function setCountry(v: string) {
  try {
    localStorage?.setItem(COUNTRY_KEY, v);
  } catch {}
}
