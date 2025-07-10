"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProblemCard, ProblemCardData } from "./problem-card";
import { useTranslation } from "@/hooks/useTranslation";

interface AppleCardsCarouselProps {
  cards: ProblemCardData[];
  className?: string;
}

export function AppleCardsCarousel({ cards, className }: AppleCardsCarouselProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleClose = () => {
    setSelectedId(null);
  };

  return (
    <div className={className}>
      <div className="relative w-full overflow-x-auto pb-8 -mb-8">
        <div className="flex gap-6 px-4 md:px-8 min-w-max">
          <AnimatePresence>
            {cards.map((card, index) => (
              <ProblemCard
                key={card.id}
                {...card}
                index={index}
                isSelected={selectedId === card.id}
                onClick={() => handleSelect(card.id)}
                onClose={handleClose}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700"
              animate={{
                scale: selectedId === card.id ? 1.5 : 1,
                backgroundColor: selectedId === card.id 
                  ? "var(--color-primary)" 
                  : "var(--color-neutral)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Overlay when a card is selected */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 z-40"
          />
        )}
      </AnimatePresence>
    </div>
  );
} 