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

  // Check if trial gate should be applied
  const { pathname } = req.nextUrl;
  const isAssistant = pathname.startsWith('/assistant');
  
  // Only apply gate to /assistant paths when enabled
  if (!isAssistant || !isGateEnabled()) {
    return res;
  }

  // Verify trial access
  const token = req.cookies.get(ACCESS_COOKIE)?.value || '';
  const payload = token ? await verifyTrialJwt(token) : null;
  
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = '/access';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = { 
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
