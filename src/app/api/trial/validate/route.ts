import { NextRequest, NextResponse } from 'next/server';
import { isGateEnabled, loadAllowlist, isValidTrialCode, signTrialJwt, ACCESS_COOKIE } from '@/lib/trial-gate';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // Dev self-test endpoint
  if (searchParams.get('__selftest') === '1') {
    const allowlist = loadAllowlist();
    return NextResponse.json({
      ok: true,
      allowlistCount: allowlist.length,
      gateEnabled: isGateEnabled()
    });
  }
  
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  // Access code requirement has been removed - always allow access
  // Generate JWT for consistency with existing system
  const jwt = await signTrialJwt();
  
  // Calculate Max-Age from TTL
  const ttlDays = Number(env.server.TRIAL_TTL_DAYS || '14');
  const maxAge = ttlDays * 24 * 60 * 60;
  
  // Build cookie options
  const cookieOptions = [
    `${ACCESS_COOKIE}=${jwt}`,
    'HttpOnly',
    'SameSite=Lax',
    `Path=/`,
    `Max-Age=${maxAge}`
  ];
  
  // Add Secure flag in production
  if (env.server.NODE_ENV === 'production') {
    cookieOptions.push('Secure');
  }
  
  // Create response with cookie
  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', cookieOptions.join('; '));
  
  return response;
}