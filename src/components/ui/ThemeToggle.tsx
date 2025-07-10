"use client";

import { useTheme } from "next-themes";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { motion } from "framer-motion";

interface ThemeToggleProps {
  visible?: boolean;
}

export function ThemeToggle({ visible }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (visible) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative z-20 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <IconSun className="w-5 h-5 text-neutral-300" />
      ) : (
        <IconMoon className="w-5 h-5 text-neutral-700" />
      )}
    </motion.button>
  );
} 