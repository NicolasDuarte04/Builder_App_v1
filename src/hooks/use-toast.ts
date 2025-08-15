"use client";

import { useState, useCallback } from 'react';

interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((newToast: Toast) => {
    // In a real implementation, wire to your UI bus or shadcn Toaster
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t !== newToast));
    }, 3000);
  }, []);

  return { toast, toasts };
} 

// Lightweight client-only function (no hooks required)
export function toast(t: Toast) {
  if (typeof window !== 'undefined') {
    // Temporary console fallback until a global Toaster is wired
    console.info('[toast]', t.title, t.description ?? '');
    try {
      // Example: window.dispatchEvent(new CustomEvent('briki:toast', { detail: t }));
    } catch {}
  }
}