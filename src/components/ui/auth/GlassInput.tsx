"use client";

import { cn } from "@/lib/utils";

interface GlassInputWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassInputWrapper = ({ children, className }: GlassInputWrapperProps) => (
  <div 
    className={cn(
      "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/5 dark:bg-neutral-900/5 backdrop-blur-sm transition-colors focus-within:border-[#009BFF]/70 focus-within:bg-[#009BFF]/5",
      className
    )}
  >
    {children}
  </div>
); 