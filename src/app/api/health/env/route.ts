import { NextResponse } from "next/server";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const missing = required.filter((k) => !process.env[k]);
  return NextResponse.json({ ok: missing.length === 0, missing });
}


