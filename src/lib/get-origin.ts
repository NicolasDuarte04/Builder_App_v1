import { headers } from 'next/headers';
import { env, getPublicEnv } from '@/lib/env';

export async function getServerOrigin(): Promise<string> {
  try {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') ?? 'https';
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) return `${proto}://${host}`;
  } catch {
    // ignore when not in a request context
  }
  const pub = getPublicEnv();
  const envUrl =
    pub.NEXT_PUBLIC_BASE_URL ||
    pub.NEXT_PUBLIC_SITE_URL ||
    env.server.SITE_URL ||
    env.server.VERCEL_GIT_COMMIT_REF /* not a URL but fallback ordering preserved */ ||
    '';
  if (envUrl) return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  return 'http://localhost:3000';
}


