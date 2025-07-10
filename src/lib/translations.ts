import esCommon from '@/locales/es/common.json';
import enCommon from '@/locales/en/common.json';

type TranslationKey = keyof typeof esCommon;

export const translations = {
  es: esCommon,
  en: enCommon,
};

export function getTranslation(language: 'es' | 'en', key: string) {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return the key if translation not found
    }
  }
  
  return value;
} 