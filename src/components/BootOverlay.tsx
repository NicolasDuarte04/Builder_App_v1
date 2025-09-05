'use client';
import { motion, AnimatePresence } from 'framer-motion';
import BrandMark from "@/components/BrandMark";
import { useEffect, useMemo, useState } from "react";

export function BootOverlay({ show }: { show: boolean }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduceMotion(mediaQuery.matches);
      
      const handleChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-background/95"
          initial={{ opacity: 1, scale: reduceMotion ? 1 : 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.25 : 0.9, ease: "easeOut" }}
        >
          <motion.h1
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.25 : 0.9, ease: "easeOut" }}
            className="text-5xl sm:text-6xl font-semibold tracking-[-0.02em]"
          >
            <BrandMark withCopilot className="text-5xl sm:text-6xl" />
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
