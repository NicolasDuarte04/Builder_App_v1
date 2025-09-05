import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'es',
  localePrefix: 'as-needed'
});

export const config = {
  // Exclude Next internals & static files
  matcher: ['/((?!_next|.*\\..*).*)']
};
