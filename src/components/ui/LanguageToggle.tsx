"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";

interface LanguageToggleProps {
  visible?: boolean;
}

export function LanguageToggle({ visible }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  if (visible) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setLanguage(language === "es" ? "en" : "es")}
      className="relative z-20 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
      aria-label="Toggle language"
    >
      {language === "es" ? "EN" : "ES"}
    </motion.button>
  );
} 