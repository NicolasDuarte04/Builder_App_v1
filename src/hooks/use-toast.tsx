"use client";

import { useState, useCallback, useEffect, useRef } from 'react';

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
    
    // Dispatch ARIA live event for screen readers
    try {
      if (typeof window !== 'undefined') {
        const message = newToast.description ? `${newToast.title}: ${newToast.description}` : newToast.title;
        window.dispatchEvent(new CustomEvent('briki:toast-live', { detail: { message } }));
      }
    } catch {}
    
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
      const message = t.description ? `${t.title}: ${t.description}` : t.title;
      window.dispatchEvent(new CustomEvent('briki:toast-live', { detail: { message } }));
    } catch {}
  }
}

// Global ARIA live region for announcing toasts to screen readers
export function ToastLiveRegion() {
  const [message, setMessage] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (ev: Event) => {
      try {
        const custom = ev as CustomEvent<{ message: string }>;
        const msg = custom?.detail?.message ?? '';
        setMessage(msg);
        setIsVisible(true);
        try {
          if (hideTimerRef.current != null) {
            clearTimeout(hideTimerRef.current);
          }
        } catch {}
        // Auto-hide visual toast after 3 seconds
        hideTimerRef.current = (setTimeout(() => {
          setIsVisible(false);
        }, 3000) as unknown) as number;
      } catch {}
    };

    window.addEventListener('briki:toast-live', handler as EventListener);
    return () => {
      window.removeEventListener('briki:toast-live', handler as EventListener);
    };
  }, []);

  return (
    <>
      {/* Screen reader only region */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
      {/* Minimal visual toast (client-only) */}
      {isVisible && (
        <div
          aria-hidden="true"
          className="fixed left-1/2 -translate-x-1/2 bottom-4 z-[9999] px-3 py-2 rounded-md shadow-lg bg-neutral-900/85 text-white dark:bg-neutral-900/85 backdrop-blur-sm border border-white/10 max-w-[88vw] text-sm"
        >
          {message}
        </div>
      )}
    </>
  );
}


