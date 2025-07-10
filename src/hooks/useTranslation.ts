"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { getTranslation } from "@/lib/translations";

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: string) => {
    return getTranslation(language, key);
  };

  return { t, language };
} 