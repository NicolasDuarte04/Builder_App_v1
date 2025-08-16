import { headers } from 'next/headers';

export function getServerOrigin(): string {
  try {
    const h = headers();
    const proto = h.get('x-forwarded-proto') ?? 'https';
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) return `${proto}://${host}`;
  } catch {
    // ignore when not in a request context
  }
  const envUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_URL ||
    '';
  if (envUrl) return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  return 'http://localhost:3000';
}


