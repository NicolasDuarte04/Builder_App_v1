"use client";

export interface FetchSavedPoliciesResponse {
  policies: any[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchSavedPolicies(params: {
  search?: string;
  insurer?: string;
  type?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<FetchSavedPoliciesResponse> {
  const url = new URL('/api/policies', window.location.origin);
  if (params.search) url.searchParams.set('search', params.search);
  if (params.insurer) url.searchParams.set('insurer', params.insurer);
  if (params.type) url.searchParams.set('type', params.type);
  if (params.from) url.searchParams.set('from', params.from);
  if (params.to) url.searchParams.set('to', params.to);
  url.searchParams.set('limit', String(params.limit ?? 20));
  url.searchParams.set('offset', String(params.offset ?? 0));
  const res = await fetch(url.toString(), { credentials: 'include' });
  if (!res.ok) {
    const msg = await safeMessage(res);
    throw new Error(msg || 'Failed to fetch saved policies');
  }
  return res.json();
}

export async function deleteSavedPolicy(id: string): Promise<boolean> {
  const res = await fetch(`/api/policies/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const msg = await safeMessage(res);
    throw new Error(msg || 'Failed to delete');
  }
  return true;
}

async function safeMessage(res: Response) {
  try { const j = await res.json(); return j?.message || j?.error; } catch { return res.statusText; }
}
