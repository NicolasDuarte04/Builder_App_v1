import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        authenticated: false,
        message: "No session found" 
      });
    }
    
    return NextResponse.json({
      authenticated: true,
      user: session.user,
      userId: (session.user as any).id || null,
      sessionData: session
    });
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to get session",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 