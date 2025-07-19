import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  const debug = {
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    },
    session: session || null,
    authOptions: {
      providers: authOptions.providers.map(p => p.id),
      pages: authOptions.pages,
      callbacks: Object.keys(authOptions.callbacks || {}),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(debug, { status: 200 });
} 