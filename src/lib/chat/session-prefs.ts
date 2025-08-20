// Lightweight cookie helpers to persist the last used category & country
import { cookies } from "next/headers";

const CAT_KEY = "briki.activeCategory";
const COUNTRY_KEY = "briki.country";

export function readPrefs() {
  const c = cookies();
  return {
    category: c.get(CAT_KEY)?.value || null,
    country: c.get(COUNTRY_KEY)?.value || null,
  };
}

export function writePrefs(next: { category?: string | null; country?: string | null }) {
  const c = cookies();
  if (typeof next.category !== "undefined") {
    if (next.category) c.set(CAT_KEY, next.category, { httpOnly: false, sameSite: "lax", path: "/" });
    else c.delete(CAT_KEY);
  }
  if (typeof next.country !== "undefined") {
    if (next.country) c.set(COUNTRY_KEY, next.country, { httpOnly: false, sameSite: "lax", path: "/" });
    else c.delete(COUNTRY_KEY);
  }
}
