import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    // Get cookies from request
    const cookieHeader = request.headers.get('cookie');
    
    console.log('🍪 Cookie header:', cookieHeader);
    
    // Get session
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      hasSession: !!session,
      sessionData: session,
      cookies: cookieHeader,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Test POST with session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({
        error: 'No session found in POST request'
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: true,
      user: session.user,
      userId: (session.user as any).id
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed in POST',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 