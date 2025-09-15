"use client";

import type React from "react";

interface CommandButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function CommandButton({ icon, label, isActive, onClick }: CommandButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center space-x-2 p-3 rounded-lg border transition-all ${
        isActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
      }`}
    >
      {icon}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </button>
  );
}