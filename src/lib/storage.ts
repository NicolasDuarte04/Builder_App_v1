import { POLICY_BUCKET } from '@/lib/buckets';
export function inferStoragePathFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    // Expected: /storage/v1/object/public/<bucket>/<path> or /storage/v1/object/sign/<bucket>/<path>
    const bucketIdx = parts.findIndex(p => p === POLICY_BUCKET);
    if (bucketIdx !== -1 && bucketIdx + 1 < parts.length) {
      const path = parts.slice(bucketIdx + 1).join('/');
      return decodeURIComponent(path);
    }
    return null;
  } catch {
    return null;
  }
}


