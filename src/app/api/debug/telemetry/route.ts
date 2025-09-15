import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const g: any = globalThis as any;
  const events = Array.isArray(g.__serverTelemetry) ? g.__serverTelemetry : [];
  return NextResponse.json({ events }, { status: 200 });
}


