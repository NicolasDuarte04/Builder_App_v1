"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface ProblemCardProps {
  card: {
    src: string;
    title: string;
    category: string;
    content: React.ReactNode;
  };
  index: number;
  layout?: boolean;
}

export function ProblemCard({ card, index, layout }: ProblemCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout={layout}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative h-[400px] w-[300px] shrink-0 rounded-2xl p-4 cursor-pointer",
        card.src
      )}
    >
      <GlowingEffect
        disabled={!hovered}
        glow={hovered}
        blur={12}
        spread={30}
        proximity={100}
        variant="default"
        className="z-[-1] !opacity-70"
      />
      <div className="relative z-10 h-full w-full overflow-hidden rounded-xl bg-black/5 dark:bg-white/10 p-6 backdrop-blur">
        <div className="relative z-10 h-full w-full">
          <div className="relative z-20">
            <p className="text-sm font-light text-neutral-600 dark:text-neutral-200">{card.category}</p>
            <h3 className="mt-2 text-xl font-bold text-neutral-900 dark:text-white">{card.title}</h3>
          </div>
          <div className="relative z-20 mt-4">{card.content}</div>
        </div>
      </div>
    </motion.div>
  );
} 