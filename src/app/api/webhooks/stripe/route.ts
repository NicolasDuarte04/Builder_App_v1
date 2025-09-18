import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
export const runtime = 'nodejs';
export const maxDuration = 60;

const supabase = createClient(
  env.server.SUPABASE_URL,
  env.server.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!env.server.STRIPE_SECRET_KEY || !env.server.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  // Import Stripe only when needed
  const { stripe } = await import('@/lib/stripe');
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.server.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Log webhook event for debugging
  console.log(`Processing webhook event: ${event.type}`, { 
    eventId: event.id, 
    timestamp: new Date().toISOString() 
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const { userId } = session.metadata;
  const customerId = session.customer;
  
  if (userId && customerId) {
    // Update user with Stripe customer ID and set to premium
    await supabase
      .from('users')
      .update({ 
        stripe_customer_id: customerId,
        membership_tier: 'premium',
        subscription_status: 'active',
        premium_active_at: new Date().toISOString()
      })
      .eq('id', userId);
  }
}

async function handleSubscriptionCreated(subscription: any) {
  const customerId = subscription.customer;
  
  // Find user by Stripe customer ID and update membership
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (user) {
    await supabase
      .from('users')
      .update({
        membership_tier: 'premium',
        subscription_status: 'active',
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        premium_active_at: new Date().toISOString(),
        premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .eq('id', user.id);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const customerId = subscription.customer;
  
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (user) {
    const isActive = subscription.status === 'active';
            await supabase
          .from('users')
          .update({
            membership_tier: isActive ? 'premium' : 'free',
            subscription_status: subscription.status,
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            premium_active_at: isActive ? new Date().toISOString() : null,
            premium_expires_at: isActive ? new Date(subscription.current_period_end * 1000).toISOString() : null
          })
          .eq('id', user.id);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer;
  
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (user) {
    await supabase
      .from('users')
      .update({
        membership_tier: 'free',
        subscription_status: 'canceled',
        subscription_end_date: null,
        premium_active_at: null,
        premium_expires_at: null
      })
      .eq('id', user.id);
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  // Handle successful payment - subscription remains active
  const customerId = invoice.customer;
  
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (user) {
    await supabase
      .from('users')
      .update({
        subscription_status: 'active'
      })
      .eq('id', user.id);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  // Handle failed payment - subscription may be past due
  const customerId = invoice.customer;
  
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (user) {
    await supabase
      .from('users')
      .update({
        subscription_status: 'past_due'
      })
      .eq('id', user.id);
  }
}
