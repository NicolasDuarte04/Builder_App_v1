// Lazy Stripe wrapper to avoid build-time dependency when Stripe isn't installed/configured
import { env, getPublicEnv } from '@/lib/env';

export const STRIPE_CONFIG = (() => {
  const pub = getPublicEnv();
  return {
    PREMIUM_PRICE_ID: pub.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1OqX2X2X2X2X2X2X2X2X2X2X',
    PREMIUM_PRICE: 399,
    CURRENCY: 'usd',
  } as const;
})();

async function getStripeClient() {
  const secret = env.server.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('Stripe not configured');
  const mod: any = await (Function('return import("stripe")'))();
  const StripeCtor = mod?.default ?? mod;
  return new StripeCtor(secret, { apiVersion: '2025-07-30.basil' } as any);
}

export async function createCheckoutSession(userId: string, userEmail: string) {
  const stripe = await getStripeClient();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      { price: STRIPE_CONFIG.PREMIUM_PRICE_ID, quantity: 1 },
    ],
    mode: 'subscription',
    success_url: env.server.STRIPE_CHECKOUT_SUCCESS_URL || `${env.server.NEXTAUTH_URL}/dashboard/insurance?upgraded=1`,
    cancel_url: env.server.STRIPE_CHECKOUT_CANCEL_URL || `${env.server.NEXTAUTH_URL}/dashboard/insurance?cancelled=1`,
    customer_email: userEmail,
    metadata: { userId },
    allow_promotion_codes: true,
  });
  return session;
}

export async function getCustomerSubscription(customerId: string) {
  const stripe = await getStripeClient();
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });
  return subscriptions.data[0] || null;
}

export async function updateUserMembership(userId: string, customerId: string, subscriptionId: string) {
  return { userId, customerId, subscriptionId };
}
