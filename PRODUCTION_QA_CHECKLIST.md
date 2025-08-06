# Production QA Checklist - WebHound Integration

## ✅ Data Integrity Tests (COMPLETED)
- [x] All 322 plans accessible in database
- [x] No duplicate (name, provider) combinations
- [x] WebHound fields properly populated (quote_link, webhound_id, provider_es)
- [x] Benefits stored as valid JSONB arrays
- [x] Legacy plans preserved (119 plans)
- [x] WebHound plans imported (203 plans)

## 🔧 Data Quality Issues

### 1. Decimal Prices (38 plans)
**Status:** Script ready to fix
**Action:** Run `node scripts/fix-decimal-prices.js`
**Impact:** Will add ~38 more plans after rounding prices

### 2. Missing Benefits (17 plans)
**Status:** Identified, needs manual enrichment
**Affected Plans:**
- 10 IMSS health plans (Mexico)
- 7 other plans (various categories)
**Action:** Either:
  - Add generic benefits by category
  - Skip these plans for now
  - Manually research via quote links

## 📊 Performance Testing

Run these queries to ensure performance:

```sql
-- Test 1: Category search (should be < 100ms)
EXPLAIN ANALYZE 
SELECT * FROM insurance_plans 
WHERE category = 'auto' 
LIMIT 10;

-- Test 2: Price range search (should be < 100ms)
EXPLAIN ANALYZE 
SELECT * FROM insurance_plans 
WHERE base_price BETWEEN 100000 AND 500000 
AND category = 'salud'
LIMIT 10;

-- Test 3: Text search in benefits (should be < 200ms)
EXPLAIN ANALYZE 
SELECT * FROM insurance_plans 
WHERE benefits::text ILIKE '%urgencias%'
LIMIT 10;
```

## 🔒 Security Checklist

- [x] No sensitive data exposed in quote_link or brochure_link
- [x] SQL injection prevention (parameterized queries)
- [x] Environment variables properly secured
- [ ] Review API rate limiting for insurance queries
- [ ] Verify CORS settings for production

## 🧪 AI Assistant Testing

### Test Queries to Run:
1. "Show me health insurance plans"
   - Should return mix of legacy and WebHound plans
   
2. "Find auto insurance under 500,000 COP"
   - Should filter by price correctly
   
3. "What insurance is available in Mexico?"
   - Should return MXN-priced plans
   
4. "Show me life insurance from Bancolombia"
   - Should return specific provider plans

### Expected Behavior:
- Response time < 2 seconds
- Returns maximum 4 plans per query
- Includes both legacy and WebHound sources
- Properly formatted benefits array

## 🚀 Deployment Steps

### 1. Pre-deployment
- [ ] Run full test suite: `node scripts/test-webhound-integration.js`
- [ ] Fix decimal prices: `node scripts/fix-decimal-prices.js`
- [ ] Create fresh backup: `npm run webhound:backup`
- [ ] Document rollback procedure

### 2. Deployment
```bash
# On production server
git pull origin main
npm install
npm run build

# Run migration if not already applied
psql "$DATABASE_URL" < migrations/004_webhound_integration.sql

# Verify connection
node scripts/test-webhound-integration.js
```

### 3. Post-deployment Verification
- [ ] Check total plan count (should be ~360 after decimal fixes)
- [ ] Test AI assistant with sample queries
- [ ] Monitor error logs for 30 minutes
- [ ] Verify quote_link redirects work

## 🔄 Rollback Plan

If issues arise:
```bash
# 1. Immediate rollback
npm run webhound:rollback

# 2. Or selective removal
psql "$DATABASE_URL" -c "DELETE FROM insurance_plans WHERE data_source = 'webhound';"

# 3. Restore from backup
psql "$DATABASE_URL" < backups/insurance_plans_[latest].sql
```

## 📈 Success Metrics

After 24 hours, verify:
- [ ] No increase in error rate
- [ ] AI assistant response time < 2s (p95)
- [ ] User engagement with insurance queries
- [ ] Quote link click-through rate
- [ ] No duplicate recommendation issues

## ⚠️ Known Limitations

1. **Decimal Prices:** 38 plans need price rounding
2. **Missing Benefits:** 17 plans have < 3 benefits
3. **No English Benefits:** Most WebHound plans lack benefits_en
4. **Mixed Currencies:** Prices in COP, MXN, USD (needs UI handling)

## 📝 Final Sign-off

- [ ] Data Team Review
- [ ] Engineering Review
- [ ] Product Owner Approval
- [ ] Deployment Scheduled

---

**Last Updated:** 2025-08-06
**Integration Version:** 1.0
**Total Plans:** 322 (203 WebHound + 119 Legacy)