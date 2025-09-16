import { NextRequest, NextResponse } from 'next/server';
import { isGateEnabled, loadAllowlist, isValidTrialCode, signTrialJwt, ACCESS_COOKIE } from '@/lib/trial-gate';

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
  // Check if gate is enabled
  if (!isGateEnabled()) {
    return NextResponse.json({ error: 'gate_disabled' }, { status: 403 });
  }
  
  // Check if allowlist is configured
  const allowlist = loadAllowlist();
  if (allowlist.length === 0) {
    return NextResponse.json({ error: 'gate_misconfigured' }, { status: 503 });
  }
  
  // Log allowlist count in dev
  if (process.env.NODE_ENV === 'development') {
    console.log('[Trial Gate] codes:', allowlist.length);
  }
  
  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  
  const { code } = body;
  
  // Check if code is provided
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'missing_code' }, { status: 400 });
  }
  
  // Validate code
  if (!isValidTrialCode(code)) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 403 });
  }
  
  // Generate JWT
  const jwt = await signTrialJwt();
  
  // Calculate Max-Age from TTL
  const ttlDays = Number(process.env.TRIAL_TTL_DAYS || '14');
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
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.push('Secure');
  }
  
  // Create response with cookie
  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', cookieOptions.join('; '));
  
  return response;
}