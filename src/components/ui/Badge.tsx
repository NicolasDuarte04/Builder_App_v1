"use client";

import React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = {
  label: string;
  variant?: 'default' | 'react' | 'nextjs' | 'tailwind' | 'figma' | 'neutral';
  className?: string;
  autoDetect?: boolean;
};

const badgeStyles = {
  default: 'bg-white/10 text-white',
  react: 'bg-blue-500/20 text-blue-300',
  nextjs: 'bg-gray-500/20 text-gray-300',
  tailwind: 'bg-purple-500/20 text-purple-300',
  figma: 'bg-pink-500/20 text-pink-300',
  neutral: 'bg-neutral-700 text-neutral-200',
};

// Auto-detect variant from label
const detectVariant = (label: string): BadgeProps['variant'] => {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes('react')) return 'react';
  if (lowerLabel.includes('next') || lowerLabel.includes('nextjs')) return 'nextjs';
  if (lowerLabel.includes('tailwind')) return 'tailwind';
  if (lowerLabel.includes('figma')) return 'figma';
  return 'neutral';
};

export function Badge({ label, variant = 'default', className, autoDetect = false }: BadgeProps) {
  const finalVariant = autoDetect ? detectVariant(label) : (variant || 'default');
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full",
        badgeStyles[finalVariant as keyof typeof badgeStyles],
        className
      )}
    >
      {label}
    </span>
  );
} 