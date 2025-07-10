"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { motion, AnimatePresence } from "motion/react";

export interface BrikiInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onSubmit'> {
  onSubmit?: (value: string) => void;
  isLoading?: boolean;
  placeholders?: string[];
  minLength?: number;
  maxLength?: number;
}

const BrikiInput = React.forwardRef<HTMLInputElement, BrikiInputProps>(
  ({ 
    className, 
    type, 
    onSubmit, 
    isLoading, 
    placeholders = [], 
    minLength = 3,
    maxLength = 1000,
    ...props 
  }, ref) => {
    const [value, setValue] = React.useState("");
    const [currentPlaceholder, setCurrentPlaceholder] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    const { t, language } = useTranslation();
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Rotate placeholders
    React.useEffect(() => {
      if (placeholders.length === 0) return;
      
      const interval = setInterval(() => {
        setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
      }, 3000);

      return () => clearInterval(interval);
    }, [placeholders]);

    // Validate input
    const validateInput = (input: string): string | null => {
      if (!input.trim()) {
        return t('input.errors.required');
      }
      if (input.trim().length < minLength) {
        return t('input.errors.tooShort');
      }
      if (input.length > maxLength) {
        return t('input.errors.tooLong');
      }
      return null;
    };

    // Handle submission
    const handleSubmit = React.useCallback(() => {
      if (isLoading) return;

      const validationError = validateInput(value);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      onSubmit?.(value.trim());
      setValue("");
    }, [value, isLoading, onSubmit, minLength, maxLength]);

    // Handle key press
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      if (error) {
        const validationError = validateInput(e.target.value);
        setError(validationError);
      }
    };

    return (
      <div className="relative w-full">
        <input
          type={type}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          ref={ref || inputRef}
          maxLength={maxLength}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "input-error" : undefined}
          className={cn(
            // Base styles
            "w-full rounded-xl border bg-white dark:bg-zinc-900 px-4 py-3 text-base",
            // Border and ring styles
            "border-neutral-200 dark:border-neutral-800",
            "ring-offset-white dark:ring-offset-zinc-900",
            // Focus styles
            "focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400",
            // Error styles
            error && "border-red-500 dark:border-red-500",
            error && "focus:ring-red-500 dark:focus:ring-red-500",
            // Placeholder styles
            "placeholder:text-neutral-500 dark:placeholder:text-neutral-400",
            // Disabled styles
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Custom height
            "h-[52px]",
            className
          )}
          {...props}
        />

        {/* Error Message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              id="input-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute -bottom-6 left-0 text-sm text-red-500"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Placeholder Animation */}
        <AnimatePresence mode="wait">
          {!value && placeholders.length > 0 && (
            <motion.span
              key={`placeholder-${currentPlaceholder}-${language}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
            >
              {placeholders[currentPlaceholder]}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Loading Indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800 dark:border-neutral-800 dark:border-t-neutral-200" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

BrikiInput.displayName = "BrikiInput";

export { BrikiInput }; 