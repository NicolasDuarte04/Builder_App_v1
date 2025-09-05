# Production Checklist - Membership System

## 🚀 Pre-Deployment

### Database Migration
- [ ] Run migration: `psql "$DATABASE_URL" -f supabase/migrations/011_add_membership_tier.sql`
- [ ] Verify new columns exist: `membership_tier`, `stripe_customer_id`, `subscription_status`, `subscription_end_date`, `premium_active_at`, `premium_expires_at`
- [ ] Confirm existing users have `membership_tier = 'free'`

### Stripe Setup (5 mins)
- [ ] Create product "Briki Plus" → recurring $3.99/month
- [ ] Copy Price ID (e.g., `price_123`)
- [ ] Go to Developers → Webhooks → "Add endpoint"
  - URL: `https://www.brikiapp.com/api/webhooks/stripe`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] Copy Webhook Signing Secret
- [ ] Optional: Enable Apple Pay/Google Pay
- [ ] Optional: Add `www.brikiapp.com` to Payment Method domains

### Vercel Environment Variables
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_123
STRIPE_CHECKOUT_SUCCESS_URL=https://www.brikiapp.com/mis-seguros?upgraded=1
STRIPE_CHECKOUT_CANCEL_URL=https://www.brikiapp.com/mis-seguros?cancelled=1
MEMBERSHIP_ENFORCEMENT=on
```

## 🔄 Deploy & Verify

- [ ] Deploy to production
- [ ] Verify webhook endpoint is accessible: `https://www.brikiapp.com/api/webhooks/stripe`
- [ ] Test webhook delivery in Stripe dashboard

## 🧪 QA Testing Script

### 1. New User Flow
- [ ] Log in as brand-new user → confirm 0/4 policies
- [ ] Upload/save 4 policies → should succeed; 4/4 displayed
- [ ] Try saving 5th → Upgrade modal appears with "Límite alcanzado"

### 2. Upgrade Flow
- [ ] Click "Desbloquear con Briki Plus – $3.99/mes"
- [ ] Stripe Checkout opens
- [ ] Pay with test card: `4242 4242 4242 4242`
- [ ] Return to app → status shows "Ilimitado" with crown icon
- [ ] Can save 5th+ policy successfully

### 3. Post-Upgrade Experience
- [ ] Success toast: "¡Listo! Briki Plus activado. Ahora puedes guardar pólizas ilimitadas."
- [ ] Membership badge shows "Briki Plus • Ilimitado"
- [ ] Progress bar removed, premium benefits shown

### 4. Subscription Management
- [ ] Cancel subscription in Stripe dashboard
- [ ] Verify webhook updates user back to free tier
- [ ] UI reverts to free user experience

### 5. Policy Management
- [ ] Delete a policy as free user → counter goes 3/4
- [ ] Save again → 4/4 works
- [ ] Premium user can delete policies without affecting unlimited status

## 🔍 Edge Cases to Verify

- [ ] **Webhook Retries**: Repeated events don't flip status wrongly
- [ ] **Failed Payments**: User remains premium until subscription becomes `past_due`/`canceled`
- [ ] **Account Deletion**: Stripe subscription cancellation handled
- [ ] **Multi-device**: Membership state refetches on page load (no stale "Ilimitado")
- [ ] **Network Issues**: Graceful handling of Stripe API failures

## 🛡️ Admin Guardrails

- [ ] **Kill Switch**: `MEMBERSHIP_ENFORCEMENT=off` bypasses limits during incidents
- [ ] **Support Override**: Admin page to manually set user to premium
- [ ] **Analytics Logging**: 
  - `membership_limit_hit`
  - `open_upgrade_modal`
  - `stripe_checkout_started`
  - `stripe_checkout_completed`
  - `membership_state_changed`

## 🚨 Troubleshooting

### "Upgrade" button does nothing
- [ ] Check `NEXT_PUBLIC_STRIPE_PRICE_ID` is set and used by checkout API
- [ ] Verify Stripe secret key is valid

### Upgraded but still shows 4/4
- [ ] Verify webhook secret matches
- [ ] Check `/api/webhooks/stripe` updates user row
- [ ] Verify webhook delivery in Stripe dashboard

### Limit not enforced
- [ ] Ensure server route checks before insert (don't trust only client)
- [ ] Check `MEMBERSHIP_ENFORCEMENT` environment variable
- [ ] Verify database migration was applied

### Webhook errors
- [ ] Check webhook endpoint accessibility
- [ ] Verify webhook secret in environment
- [ ] Monitor webhook delivery in Stripe dashboard

## 📊 Monitoring

- [ ] Set up webhook delivery monitoring
- [ ] Monitor membership state changes
- [ ] Track upgrade conversion rates
- [ ] Alert on webhook failures

## 🎯 Success Metrics

After 24 hours, verify:
- [ ] No increase in error rate
- [ ] Webhook delivery success > 95%
- [ ] Upgrade flow completion rate
- [ ] User experience remains smooth
- [ ] No duplicate subscription issues

## 📝 Final Sign-off

- [ ] Engineering Review
- [ ] Product Owner Approval
- [ ] QA Team Sign-off
- [ ] Production Deployment Scheduled
