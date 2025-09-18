import { SignJWT, jwtVerify } from 'jose';
import { env, getPublicEnv } from '@/lib/env';

export const ACCESS_COOKIE = 'briki_trial_access';

export function loadAllowlist(): string[] {
  const raw = env.server.TRIAL_CODES || "";
  return raw.split(/[, \n\r]+/).map(s => s.trim()).filter(Boolean);
}

const norm = (s:string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

const safeEq = (a:string,b:string) => {
  if (a.length !== b.length) return false;
  let r = 0; for (let i=0;i<a.length;i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

export function isValidTrialCode(code: string): boolean {
  const allow = loadAllowlist(); if (!allow.length) return false;
  const sub = norm(code);
  let ok = false; for (const c of allow) ok = ok || safeEq(norm(c), sub);
  return ok;
}

export function isGateEnabled() {
  const pub = getPublicEnv();
  return pub.NEXT_PUBLIC_TRIAL_GATE_ENABLED === '1' || env.server.TRIAL_GATE_ENABLED === '1';
}

export async function signTrialJwt() {
  const secret = env.server.TRIAL_JWT_SECRET; if (!secret) throw new Error('TRIAL_JWT_SECRET missing');
  const ttlDays = Number(env.server.TRIAL_TTL_DAYS || '14');
  const enc = new TextEncoder().encode(secret);
  const iat = Math.floor(Date.now()/1000), exp = iat + ttlDays*24*60*60;
  return await new SignJWT({ sub:'trial', scope:'assistant' })
    .setProtectedHeader({ alg:'HS256' }).setIssuedAt(iat).setExpirationTime(exp).sign(enc);
}

export async function verifyTrialJwt(token: string) {
  const secret = env.server.TRIAL_JWT_SECRET; if (!secret) return null;
  try {
    const enc = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, enc);
    return payload;
  } catch { return null; }
}
