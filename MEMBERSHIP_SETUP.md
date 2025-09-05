# Briki Plus Membership Setup

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret from Stripe dashboard
NEXT_PUBLIC_STRIPE_PRICE_ID=price_... # Price ID for $3.99/month subscription

# Stripe Checkout URLs (optional - defaults to localhost in development)
STRIPE_CHECKOUT_SUCCESS_URL=https://www.brikiapp.com/dashboard/insurance?upgraded=1
STRIPE_CHECKOUT_CANCEL_URL=https://www.brikiapp.com/dashboard/insurance?cancelled=1
```

## Stripe Setup Steps

1. **Create Product in Stripe Dashboard:**
   - Go to Products → Add Product
   - Name: "Briki Plus"
   - Price: $3.99/month (recurring)
   - Copy the Price ID (e.g., `price_123...`)

2. **Configure Webhook:**
   - Go to Developers → Webhooks → Add endpoint
   - URL: `https://www.brikiapp.com/api/webhooks/stripe`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the Webhook Signing Secret

3. **Update Environment Variables:**
   - Set `NEXT_PUBLIC_STRIPE_PRICE_ID` to your Price ID
   - Set `STRIPE_WEBHOOK_SECRET` to your webhook secret

## Database Migration

Ensure your `users` table has these columns:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_active_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP;
```

## Testing

1. **Local Development:**
   - Use Stripe test keys
   - Test with card: `4242 4242 4242 4242`
   - Check webhook logs in Stripe dashboard

2. **Production:**
   - Use Stripe live keys
   - Ensure webhook endpoint is accessible
   - Monitor webhook delivery in Stripe dashboard

## Features

- **Free Plan:** Up to 4 saved policies
- **Briki Plus:** Unlimited policies + premium features
- **Navbar Crown:** Shows membership status and opens modal
- **Upgrade Flow:** Stripe checkout → webhook → membership update
- **i18n Support:** English and Spanish localization
- **Accessibility:** Focus trap, ARIA labels, keyboard navigation
