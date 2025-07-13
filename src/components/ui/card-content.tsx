"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardContentProps {
  title: string;
  category: string;
  content: string;
  isExpanded: boolean;
  className?: string;
}

export function CardContent({
  title,
  category,
  content,
  isExpanded,
  className,
}: CardContentProps) {
  return (
    <motion.div
      className={cn(
        "relative z-10 p-6 w-full h-full flex flex-col",
        isExpanded ? "justify-start" : "justify-end",
        className
      )}
      initial={false}
      animate={isExpanded ? "expanded" : "collapsed"}
    >
      <motion.span
        variants={{
          expanded: { opacity: 1, y: 0 },
          collapsed: { opacity: 0.7, y: 0 },
        }}
        className="text-sm font-medium text-neutral-400 dark:text-neutral-500 mb-2"
      >
        {category}
      </motion.span>
      
      <motion.h3
        variants={{
          expanded: { scale: 1.1, y: 0 },
          collapsed: { scale: 1, y: 0 },
        }}
        className="text-2xl font-bold mb-4 text-neutral-900 dark:text-white"
      >
        {title}
      </motion.h3>

      <motion.p
        variants={{
          expanded: { 
            opacity: 1,
            height: "auto",
            y: 0,
            transition: { duration: 0.3, delay: 0.1 }
          },
          collapsed: { 
            opacity: 0,
            height: 0,
            y: 20,
            transition: { duration: 0.2 }
          }
        }}
        className="text-neutral-600 dark:text-neutral-200 leading-relaxed text-opacity-100"
      >
        {content}
      </motion.p>
    </motion.div>
  );
} 