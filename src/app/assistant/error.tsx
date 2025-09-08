'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const msg = String(error?.message || '');
      const isChunk = msg.includes('ChunkLoadError') || msg.includes('/_next/static/chunks/app/assistant/page.js');
      if (isChunk) {
        console.log('[Dev] Chunk load error detected, auto-reloading in 800ms...');
        const t = setTimeout(() => { window.location.reload(); }, 800);
        return () => clearTimeout(t);
      }
    }
  }, [error]);

  return (
    <div className="p-6 max-w-lg mx-auto mt-12">
      <h2 className="text-base font-semibold">Algo falló al cargar esta vista.</h2>
      <p className="text-sm text-muted-foreground mt-2">
        {process.env.NODE_ENV !== 'production'
          ? 'Dev helper: detecté un error de chunk. Intentaré recargar automáticamente.'
          : 'Intenta de nuevo.'}
      </p>
      <div className="mt-4 flex gap-2">
        <button
          className="px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
          onClick={() => (typeof window !== 'undefined' ? window.location.reload() : reset())}
        >
          Reload now
        </button>
        <button 
          className="px-3 py-1.5 rounded-md border hover:bg-muted transition-colors" 
          onClick={reset}
        >
          Try React reset
        </button>
      </div>
      {process.env.NODE_ENV !== 'production' && (
        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Debug info</summary>
          <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
            {error?.message || 'No error message'}
          </pre>
        </details>
      )}
    </div>
  );
}
