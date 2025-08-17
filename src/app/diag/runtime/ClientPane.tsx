"use client";

import React from 'react';

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-2 overflow-auto rounded-md bg-gray-100 p-3 text-xs text-gray-900">
      {children}
    </pre>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  const cls = ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  return <span className={`rounded px-2 py-1 text-xs ${cls}`}>{ok ? 'OK' : 'FAIL'}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-gray-800">{title}</div>
      {children}
    </div>
  );
}

function json(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export default function ClientPane() {
  const [env, setEnv] = React.useState<any>(null);
  const [v2, setV2] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const [a, b] = await Promise.all([
          fetch('/api/env/diag', { cache: 'no-store' })
            .then((r) => r.json())
            .catch((e) => ({ ok: false, error: String(e) })),
          fetch('/api/plans_v2/diag', { cache: 'no-store' })
            .then((r) => r.json())
            .catch((e) => ({ ok: false, error: String(e) })),
        ]);
        if (!cancelled) {
          setEnv(a);
          setV2(b);
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      }
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-xl font-bold">Runtime diagnostics</h1>
      <div className="mb-6 text-sm text-gray-700">
        Client rendering OK <StatusBadge ok={true} />
      </div>

      {error && (
        <Section title="Error">
          <Code>{error}</Code>
        </Section>
      )}

      <Section title="/api/env/diag">
        <div className="text-sm">
          Status <StatusBadge ok={!!env?.ok} />
        </div>
        <Code>{json(env)}</Code>
      </Section>

      <Section title="/api/plans_v2/diag">
        <div className="text-sm">
          Status <StatusBadge ok={!!v2?.ok} />
        </div>
        <Code>{json(v2)}</Code>
      </Section>
    </div>
  );
}


