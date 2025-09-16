/** @type {import('next-intl').NextConfig} */
const config = {
  // Supported locales
  locales: ['en', 'es'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
  
  // Default namespace
  defaultNS: 'common',
  
  // Include all namespaces
  ns: ['common', 'membership'],
  
  // Prevent key leaking
  returnNull: false,
  returnEmptyString: false,
  
  // Use default key separator '.'
  keySeparator: '.',
  
  // Fallback behavior
  fallbackLng: 'es',
  fallbackNS: 'common',
  
  // Error handling
  missingKeyHandler: (lng, ns, key) => {
    console.warn(`Missing translation key: ${key} in namespace: ${ns} for language: ${lng}`);
    return '';
  }
};

module.exports = config;