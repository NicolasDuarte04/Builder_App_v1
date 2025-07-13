"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlowingBackgroundProps {
  children: ReactNode;
  className?: string;
}

export const GlowingBackground: React.FC<GlowingBackgroundProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)}>
      {/* Glowing background elements */}
      <div className="absolute inset-0">
        {/* Primary glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        
        {/* Secondary glow */}
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/20 dark:bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Tertiary glow */}
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500/20 dark:bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Additional subtle glows */}
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/15 dark:bg-cyan-500/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/3 right-1/3 w-56 h-56 bg-indigo-500/15 dark:bg-indigo-500/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}; 