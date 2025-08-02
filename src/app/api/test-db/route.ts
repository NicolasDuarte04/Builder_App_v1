import { NextResponse } from 'next/server';
import { testConnection, hasDatabaseUrl } from '@/lib/render-db';

export async function GET() {
  try {
    const envStatus = {
      RENDER_POSTGRES_URL: !!process.env.RENDER_POSTGRES_URL,
      NODE_ENV: process.env.NODE_ENV,
      hasDatabaseUrl,
    };

    let connectionTest = false;
    let connectionError = null;

    if (hasDatabaseUrl) {
      try {
        connectionTest = await testConnection();
      } catch (error) {
        connectionError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return NextResponse.json({
      status: 'ok',
      environment: envStatus,
      database: {
        connected: connectionTest,
        error: connectionError,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}