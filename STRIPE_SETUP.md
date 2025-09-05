# Stripe Integration Setup Guide

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PREMIUM_PRICE_ID=price_your_premium_price_id_here
```

## Stripe Dashboard Setup

### 1. Create a Product and Price

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Products → Add Product
3. Create a product named "Briki Premium"
4. Add a recurring price:
   - Amount: $3.99
   - Currency: USD
   - Billing: Monthly
   - Copy the Price ID (starts with `price_`)

### 2. Configure Webhooks

1. Go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret (starts with `whsec_`)

### 3. Test Mode

- Use test card numbers for testing:
  - Success: `4242 4242 4242 4242`
  - Decline: `4000 0000 0000 0002`
  - Expiry: Any future date
  - CVC: Any 3 digits

## Database Migration

Run the migration to add membership fields:

```bash
# Apply the migration
psql "$DATABASE_URL" -f supabase/migrations/011_add_membership_tier.sql
```

## Testing the Integration

1. Start your development server
2. Try to save more than 4 policies
3. Verify the upgrade modal appears
4. Test the Stripe checkout flow
5. Verify webhook updates user membership

## Production Deployment

1. Update environment variables with production Stripe keys
2. Ensure webhook endpoint is accessible
3. Test with real payment methods
4. Monitor webhook delivery in Stripe dashboard
