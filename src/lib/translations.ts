import esCommon from '@/locales/es/common.json';
import enCommon from '@/locales/en/common.json';

type TranslationKey = keyof typeof esCommon;

export const translations = {
  es: esCommon,
  en: enCommon,
};

type TranslationOptions = {
  fallback?: unknown;
  returnObjects?: boolean;
};

export function getTranslation(language: 'es' | 'en', key: string, opts?: TranslationOptions) {
  const keys = key.split('.');
  let value: any = translations[language] || translations['en'];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // If caller explicitly provided a fallback option (even if undefined), return it; otherwise return key
      if (opts && Object.prototype.hasOwnProperty.call(opts, 'fallback')) {
        return opts.fallback as any;
      }
      return key;
    }
  }
  
  return value;
} 