"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { CardContent } from "./card-content";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface ProblemCardData {
  id: string;
  title: string;
  category: string;
  content: string;
  image?: string;
}

interface ProblemCardProps extends ProblemCardData {
  isSelected: boolean;
  onClick: () => void;
  onClose: () => void;
  index: number;
}

export function ProblemCard({
  id,
  title,
  category,
  content,
  image,
  isSelected,
  onClick,
  onClose,
  index,
}: ProblemCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  useOutsideClick(cardRef, isSelected ? onClose : () => {});

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ scale: 1, y: 0 }}
      animate={{
        scale: isSelected ? 1.1 : 1,
        y: isSelected ? -20 : 0,
        transition: { type: "spring", stiffness: 300, damping: 30 }
      }}
      onClick={!isSelected ? onClick : undefined}
      className={cn(
        "relative w-72 h-96 rounded-xl overflow-hidden cursor-pointer",
        "bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900",
        isSelected && "cursor-default shadow-2xl"
      )}
      style={{ 
        transformOrigin: "center center",
      }}
    >
      {/* Background Image or Gradient */}
      {image ? (
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={index < 2}
        />
      ) : (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-500/10 dark:to-purple-500/10"
          style={{
            backgroundImage: `radial-gradient(circle at ${(index % 3) * 50}% ${(index % 2) * 100}%, rgba(255,255,255,0.1), transparent)`
          }}
        />
      )}

      {/* Overlay */}
      <motion.div
        className="absolute inset-0 bg-black/20 dark:bg-black/40"
        initial={false}
        animate={{ opacity: isSelected ? 0.6 : 0.3 }}
      />

      {/* Content */}
      <CardContent
        title={title}
        category={category}
        content={content}
        isExpanded={isSelected}
      />

      {/* Close button */}
      {isSelected && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </motion.button>
      )}
    </motion.div>
  );
} 