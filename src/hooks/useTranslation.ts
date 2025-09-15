'use client';

import { useLanguage } from '@/components/LanguageProvider';
import { getTranslation } from '@/lib/translations';

function normalizeLang(code?: string): 'es' | 'en' {
  const c = (code || 'en').toLowerCase();
  if (c.startsWith('es')) return 'es';
  return 'en';
}

export function useTranslation() {
  const { language } = useLanguage();
  const lang = normalizeLang(language);

  const t = (key: string) => {
    return getTranslation(lang, key);
  };

  return { t, language: lang };
}