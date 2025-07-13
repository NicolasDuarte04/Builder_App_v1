"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface HoverCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const HoverCard = ({ children, className = "", delay = 0 }: HoverCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.16, 1, 0.3, 1] 
      }}
      viewport={{ once: true }}
      className={`group cursor-pointer ${className}`}
    >
      <motion.div
        whileHover={{ 
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        className="relative"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}; 