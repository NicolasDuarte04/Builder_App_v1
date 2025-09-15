"use client";

import { ReactNode, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface FocusAreaPillProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  icon?: ReactNode;
  ariaLabelSelectedKey: string;
  ariaLabelUnselectedKey: string;
}

export default function FocusAreaPill({
  label,
  selected,
  onToggle,
  icon,
  ariaLabelSelectedKey,
  ariaLabelUnselectedKey,
}: FocusAreaPillProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onToggle();
    }
  };

  const ariaLabel = selected ? ariaLabelSelectedKey : ariaLabelUnselectedKey;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-briki-500",
        selected
          ? "bg-briki-50 border-briki-500/30 text-briki-600 ring-1 ring-inset ring-briki-500/20"
          : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
      )}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
