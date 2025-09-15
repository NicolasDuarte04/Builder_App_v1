// Server-only helpers (can use next/headers safely)
import { cookies } from 'next/headers';

const SID_KEY = 'briki.sessionId';
const CAT_KEY = 'briki.activeCategory';
const COUNTRY_KEY = 'briki.country';

export async function getSessionIdFromCookies() {
  try {
    const c = await cookies();
    return c.get(SID_KEY)?.value ?? null;
  } catch {
    return null;
  }
}

export async function readPrefs() {
  try {
    const c = await cookies();
    return {
      category: c.get(CAT_KEY)?.value ?? null,
      country: c.get(COUNTRY_KEY)?.value ?? null,
    };
  } catch {
    return { category: null, country: null };
  }
}

export async function writePrefs(p: { category?: string | null; country?: string | null }) {
  try {
    const c = await cookies();
    if (p.category != null) c.set(CAT_KEY, String(p.category), { path: '/' });
    if (p.country != null) c.set(COUNTRY_KEY, String(p.country), { path: '/' });
  } catch {}
}
