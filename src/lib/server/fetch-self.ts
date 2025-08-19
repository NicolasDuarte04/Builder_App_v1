import { headers } from 'next/headers';

export function getBaseUrlFromHeaders(h: Headers): string {
  const xfProto = h.get('x-forwarded-proto');
  const xfHost = h.get('x-forwarded-host');
  if (xfProto && xfHost) return `${xfProto}://${xfHost}`;

  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, '');
  if (envBase) return envBase;

  return 'http://localhost:3000';
}

/**
 * Build an absolute URL to our own API and forward auth/protection headers.
 * @param path e.g. "/api/plans_v2/search?country=CO&includeCategories=salud"
 * @param init optional fetch init; headers will be merged with forwarded cookies
 */
export async function makeSelfRequest(path: string, init: RequestInit = {}) {
  // Next.js 15 requires awaiting headers() in the request context
  const h = await headers();
  const base = getBaseUrlFromHeaders(h as any);
  try { console.info('[fetch-self] base', { base, xfProto: h.get('x-forwarded-proto'), xfHost: h.get('x-forwarded-host') }); } catch {}

  const forwarded = new Headers(init.headers || {});
  // Forward protection + auth context if present
  const cookie = h.get('cookie');
  if (cookie && !forwarded.has('cookie')) forwarded.set('cookie', cookie);

  const bypass = h.get('x-vercel-protection-bypass');
  if (bypass && !forwarded.has('x-vercel-protection-bypass')) {
    forwarded.set('x-vercel-protection-bypass', bypass);
  }

  const lang = h.get('accept-language');
  if (lang && !forwarded.has('accept-language')) {
    forwarded.set('accept-language', lang);
  }

  // Ensure JSON default unless caller overrides
  if (!forwarded.has('accept')) forwarded.set('accept', 'application/json');

  const url = path.startsWith('http') ? path : `${base}${path}`;
  try { console.info('[fetch-self] url', url); } catch {}
  const reqInit: RequestInit = {
    cache: 'no-store',
    ...init,
    headers: forwarded,
  };

  return { url, init: reqInit };
}

export async function fetchSelf(path: string, init: RequestInit = {}) {
  const { url, init: reqInit } = await makeSelfRequest(path, init);
  return fetch(url, reqInit);
}


