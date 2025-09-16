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

  const t = (key: string, opts?: { fallback?: unknown; returnObjects?: boolean }) => {
    return getTranslation(lang, key, opts);
  };

  return { t, language: lang };
}