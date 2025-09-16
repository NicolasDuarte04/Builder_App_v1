import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyTrialJwt, isGateEnabled, ACCESS_COOKIE } from '@/lib/trial-gate';

const intl = createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'es',
  localePrefix: 'as-needed'
});

export default async function middleware(req: NextRequest) {
  // First apply next-intl middleware
  const res = intl(req);

  // Trial gate has been disabled - allow all access to assistant
  // No access code required anymore

  return res;
}

export const config = { 
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
