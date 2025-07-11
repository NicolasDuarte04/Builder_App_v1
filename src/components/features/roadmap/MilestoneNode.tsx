"use client";

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Mapping of tool/category names to their respective icon paths
const iconMap: Record<string, string> = {
  github: '/file.svg', // Placeholder, as github icon is missing
  replit: '/images/products/replit.png',
  render: '/images/products/render.png',
  vercel: '/images/products/vercel.png',
  stripe: '/images/products/stripe.png',
  midjourney: '/images/products/midjourney.png',
  openai: '/images/products/openai.png',
  gemini: '/images/products/gemini.png',
  claude: '/images/products/claude.png',
  perplexity: '/images/products/perplexity.png',
  figma: '/file.svg', // Placeholder
  default: '/file.svg', // A fallback icon
};

interface MilestoneNodeData {
  label: string;
  icon: string;
}

export const MilestoneNode = memo(({ data }: NodeProps<MilestoneNodeData>) => {
  const iconSrc = iconMap[data.icon?.toLowerCase()] || iconMap['default'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl shadow-md p-4 flex flex-col items-center gap-2 w-[180px] border border-neutral-200 dark:border-neutral-700"
    >
      <Handle type="target" position={Position.Top} className="!bg-neutral-400" />
      
      <img 
        src={iconSrc} 
        alt={`${data.label} icon`}
        className="w-8 h-8 object-contain"
        onError={(e) => { e.currentTarget.src = iconMap['default']; }} // Fallback if icon fails to load
      />
      <p className="font-semibold text-center text-sm">{data.label}</p>
      
      <Handle type="source" position={Position.Bottom} className="!bg-neutral-400" />
    </motion.div>
  );
});

MilestoneNode.displayName = 'MilestoneNode'; 