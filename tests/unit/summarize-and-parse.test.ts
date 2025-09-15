import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit test the behavior of summarize-and-parse route helpers via direct import
// We target approxTokens and sanitize behaviors indirectly by calling the handler.

// The route uses OpenAI when key is present; we simulate both branches.

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: vi.fn(async () => ({
      choices: [{ message: { content: 'texto resumido' } }]
    })) } };
  }
}));

async function callRoute(body: any, env: Record<string, string | undefined> = {}) {
  const orig = { ...process.env };
  // Apply overrides with deletion support for undefined
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete (process.env as any)[k];
    else (process.env as any)[k] = v as string;
  }
  const mod = await import('../../src/app/api/briefs/summarize-and-parse/route');
  const req = new Request('http://local/api/briefs/summarize-and-parse', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  });
  const res: Response = await (mod as any).POST(req as any);
  Object.assign(process.env, orig);
  return res;
}

describe('summarize-and-parse route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns compactText equal to input when under limit', async () => {
    const res = await callRoute({ text: 'hola mundo', locale: 'es' }, { NEXT_PUBLIC_LONG_PASTE_CHAR_LIMIT: '12000' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.compactText).toBe('hola mundo');
    expect(json.originalChars).toBe(10);
  });

  it('falls back to truncation when over limit and no OPENAI key', async () => {
    const text = 'x'.repeat(13000);
    const res = await callRoute({ text, locale: 'es' }, { NEXT_PUBLIC_LONG_PASTE_CHAR_LIMIT: '12000', OPENAI_API_KEY: undefined });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fallback).toBe('truncated');
    expect(json.compactText.length).toBe(12000);
  });

  it('calls OpenAI when key present and returns compactText', async () => {
    const text = 'x'.repeat(13000);
    const res = await callRoute({ text, locale: 'es' }, { NEXT_PUBLIC_LONG_PASTE_CHAR_LIMIT: '12000', OPENAI_API_KEY: 'sk-test' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.compactText).toBe('string');
    expect(json.compactText.length).toBeGreaterThan(0);
  });
});


