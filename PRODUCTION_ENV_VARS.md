# Production Environment Variables for Membership System

## Required Variables

Add these to your Vercel production environment:

```bash
# Stripe Configuration (Production)
STRIPE_SECRET_KEY=sk_live_your_production_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
NEXT_PUBLIC_STRIPE_PRICE_ID=price_your_briki_plus_price_id

# Stripe Checkout URLs
STRIPE_CHECKOUT_SUCCESS_URL=https://www.brikiapp.com/mis-seguros?upgraded=1
STRIPE_CHECKOUT_CANCEL_URL=https://www.brikiapp.com/mis-seguros?cancelled=1

# Membership Enforcement (Optional - defaults to 'on')
MEMBERSHIP_ENFORCEMENT=on
```

## Stripe Dashboard Setup

### 1. Create Product "Briki Plus"
- Name: Briki Plus
- Price: $3.99/month (recurring)
- Copy the Price ID (starts with `price_`)

### 2. Configure Webhook
- URL: `https://www.brikiapp.com/api/webhooks/stripe`
- Events to select:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy the Webhook Signing Secret (starts with `whsec_`)

### 3. Payment Methods (Optional)
- Enable Apple Pay / Google Pay
- Add `www.brikiapp.com` to Payment Method domains

## Verification Steps

1. **Environment Variables**: All variables are set in Vercel
2. **Webhook Endpoint**: `/api/webhooks/stripe` is accessible
3. **Price ID**: Matches the one in Stripe dashboard
4. **Success/Cancel URLs**: Point to correct production URLs

## Testing in Production

Use these test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits
