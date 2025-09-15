'use client';

export default function Error({
  error,
  reset
}: { error: any; reset: () => void }) {
  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Something went wrong</h2>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Dev cache hiccup or ChunkLoadError. Reload to recover.</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onClick={() => location.reload()}
        >
          Reload now
        </button>
        <button 
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onClick={() => reset()}
        >
          Try React reset
        </button>
      </div>
    </div>
  );
}
