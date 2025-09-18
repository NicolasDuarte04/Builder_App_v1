import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { env } from '@/lib/env';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!env.server.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe not configured', message: 'Checkout service unavailable' },
      { status: 500 }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Sign in required to subscribe' },
        { status: 401 }
      );
    }

    const { email } = session.user as any;
    if (!email) {
      return NextResponse.json(
        { error: 'missing_email', message: 'Email required for subscription' },
        { status: 400 }
      );
    }

    // Import Stripe only when needed
    const { createCheckoutSession } = await import('@/lib/stripe');
    
    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession(session.user.id, email);

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'checkout_failed', message: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
