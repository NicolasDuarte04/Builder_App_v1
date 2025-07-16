import { NextRequest, NextResponse } from 'next/server';
import { getPolicyUploadsByUser } from '@/lib/supabase-policy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const uploads = await getPolicyUploadsByUser(userId);

    return NextResponse.json({
      success: true,
      uploads
    });

  } catch (error) {
    console.error('❌ Error fetching policy uploads:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch policy uploads',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 