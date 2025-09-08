import crypto from 'crypto';

const secret = (process.env.UPLOAD_STATUS_SECRET || '').trim();

export function signUploadId(uploadId: string): string {
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(uploadId).digest('hex');
}

export function verifyUploadSig(uploadId: string, sig?: string | null): boolean {
  if (!secret || !sig) return false;
  try {
    const expected = signUploadId(uploadId);
    // timing-safe compare
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)));
  } catch { 
    return false; 
  }
}
