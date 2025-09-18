import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
export const runtime = 'nodejs';

const supabase = createClient(
  env.server.SUPABASE_URL,
  env.server.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Sign in required' },
        { status: 401 }
      );
    }

    const { email } = session.user as any;
    if (!email) {
      return NextResponse.json(
        { error: 'missing_email', message: 'Email required' },
        { status: 400 }
      );
    }

    // Get user membership details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, membership_tier, subscription_status, subscription_end_date')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'user_not_found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's policy count
    const { count: policyCount, error: countError } = await supabase
      .from('saved_policies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error counting policies:', countError);
      return NextResponse.json(
        { error: 'count_failed', message: 'Failed to count policies' },
        { status: 500 }
      );
    }

    const isPremium = user.membership_tier === 'premium';
    const freeLimit = 4;
    const canSaveMore = isPremium || (policyCount || 0) < freeLimit;
    const remainingFree = isPremium ? 'unlimited' : Math.max(0, freeLimit - (policyCount || 0));

    return NextResponse.json({
      membership: {
        tier: user.membership_tier,
        status: user.subscription_status,
        endDate: user.subscription_end_date,
        isPremium,
      },
      policies: {
        count: policyCount || 0,
        limit: isPremium ? 'unlimited' : freeLimit,
        remaining: remainingFree,
        canSaveMore,
      },
    });
  } catch (error: any) {
    console.error('Error getting membership status:', error);
    return NextResponse.json(
      { error: 'internal_error', message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
