export type PolicyId = string;

export async function getPolicyById(id: PolicyId): Promise<any> {
  const res = await fetch(`/api/policies/${id}`, { credentials: 'include' });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || `Failed to load policy ${id}`);
  }
  const json = await res.json();
  return json.policy ?? json;
}

export async function updatePolicy(id: PolicyId, data: Partial<{ custom_name: string; metadata: any; analysis: any }>): Promise<any> {
  const res = await fetch(`/api/policies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || `Failed to update policy ${id}`);
  }
  const json = await res.json();
  return json.policy ?? json;
}

export async function deletePolicy(id: PolicyId): Promise<void> {
  const res = await fetch(`/api/policies/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || `Failed to delete policy ${id}`);
  }
}

async function safeJson(res: Response): Promise<any | null> {
  try { return await res.json(); } catch { return null; }
}


