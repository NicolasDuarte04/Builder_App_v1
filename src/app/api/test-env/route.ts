import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    RENDER_POSTGRES_URL: !!process.env.RENDER_POSTGRES_URL,
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json(envCheck);
} 