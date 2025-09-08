'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dev = process.env.NODE_ENV !== 'production';
  return (
    <div className="p-6">
      <h2 className="font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mt-2">
        {dev ? 'Dev cache hiccup or ChunkLoadError. Reload to recover.' : 'Please reload.'}
      </p>
      <div className="mt-4 flex gap-3">
        <button 
          className="px-3 py-1.5 rounded-md border hover:bg-muted transition-colors cursor-pointer"
          onClick={() => location.reload()}
        >
          Reload now
        </button>
        <button 
          className="px-3 py-1.5 rounded-md border hover:bg-muted transition-colors cursor-pointer"
          onClick={() => reset()}
        >
          Try React reset
        </button>
      </div>
    </div>
  );
}
