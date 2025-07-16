# 🧪 Briki Insurance AI - Test Plan

## ✅ Test Objectives

1. **Validate Database Connection**: Confirm briki-database (Render) is being queried
2. **Verify Real Plan Rendering**: Ensure real plans display as cards, not text
3. **Test Fallback System**: Confirm no mock data is shown
4. **Check Onboarding Context**: Verify user context reaches AI assistant

## 🔍 Test Cases

### Test Case 1: Database Connection Validation

**Objective**: Confirm the AI is hitting the PostgreSQL database

**Steps**:
1. Open browser dev tools → Network tab
2. Navigate to `/assistant`
3. Ask: "Necesito un seguro de auto"
4. Check console logs for:
   ```
   🛠️  Executing get_insurance_plans tool with: { category: 'auto', max_price: 100000, country: undefined }
   🔍 queryInsurancePlans called with filters: { category: 'auto', max_price: 100000, country: undefined, limit: 4 }
   🔍 Executing final query: { query: 'SELECT * FROM insurance_plans WHERE 1=1 AND category ILIKE $1 AND base_price <= $2 ORDER BY base_price ASC LIMIT $3', params: [ '%auto%', 100000, 4 ] }
   ✅ Database query successful: Found X plans.
   ```

**Expected Result**: ✅ Database queries are logged with real SQL

### Test Case 2: Real Plan Validation

**Objective**: Verify only real plans are returned (no placeholder data)

**Steps**:
1. Ask for insurance in any category
2. Check console logs for validation results:
   ```
   🔍 Validation results: {
     totalPlans: X,
     validPlans: Y,
     invalidPlans: Z,
     reasons: [...]
   }
   ```

**Expected Result**: 
- ✅ `validPlans` should be 0 if database has placeholder data
- ✅ `invalidPlans` should show why plans were rejected
- ✅ No "No hay planes disponibles públicamente" in results

### Test Case 3: Plan Rendering Test

**Objective**: Verify real plans render as visual cards

**Steps**:
1. If database has real plans, they should render as:
   - Visual cards with provider logos
   - Quote buttons
   - Price information
   - Benefits list
2. If no real plans, should show:
   - Blue info box: "No se encontraron planes de seguros disponibles para los criterios especificados"

**Expected Result**: 
- ✅ Real plans → Visual cards
- ✅ No real plans → Info message (no mock data)

### Test Case 4: Fallback System Test

**Objective**: Confirm no sample/mock data is shown

**Steps**:
1. Check console logs for:
   ```
   📤 Tool result being returned to AI: {
     planCount: 0,
     hasRealPlans: false,
     insuranceType: 'auto'
   }
   ```

**Expected Result**: 
- ✅ `hasRealPlans: false` when no real data
- ✅ `planCount: 0` when no valid plans
- ❌ No "sample-1", "sample-2" IDs
- ❌ No "Plan Salud Básico" mock names

### Test Case 5: Onboarding Context Test

**Objective**: Verify onboarding data reaches AI assistant

**Steps**:
1. Complete onboarding flow
2. Navigate to `/assistant`
3. Check for context message in welcome screen
4. Ask for insurance recommendations
5. Verify AI uses context in responses

**Expected Result**:
- ✅ Context shown in welcome message
- ✅ AI mentions user's preferences in responses

## 🐛 Debug Commands

### Check Database Connection
```bash
# In browser console
console.log('Database connection test');
fetch('/api/test-db')
  .then(r => r.json())
  .then(console.log);
```

### Check Plan Validation
```javascript
// In browser console - check MessageRenderer logs
console.log('Plan validation test');
// Look for: 🔍 Validation results in console
```

### Check Tool Execution
```javascript
// In browser console - check tool call logs
console.log('Tool execution test');
// Look for: 🛠️ Executing get_insurance_plans tool
```

## 📊 Expected Results Matrix

| Test Case | Current State | Expected State | Status |
|-----------|---------------|----------------|---------|
| Database Connection | ✅ Working | ✅ Working | ✅ |
| Real Plan Validation | ❌ Placeholder data | ✅ Only real plans | 🔄 |
| Plan Rendering | ❌ Text display | ✅ Visual cards | 🔄 |
| Fallback System | ❌ Mock data | ✅ No fallback | 🔄 |
| Onboarding Context | ❌ Not integrated | ✅ Context injection | 🔄 |

## 🚨 Known Issues

1. **Database contains placeholder data**: "No hay planes disponibles públicamente"
2. **Fallback system shows mock data**: "Plan Salud Básico" from sample data
3. **Plan rendering issues**: Real plans may not display as cards
4. **Context integration**: Onboarding data not fully utilized

## ✅ Success Criteria

- [ ] Database queries return only real plans
- [ ] No mock/sample data in responses
- [ ] Real plans render as visual cards
- [ ] Empty results show proper "no plans" message
- [ ] Onboarding context is visible and used by AI
- [ ] Console logs show proper validation results

## 🔧 Quick Fixes Applied

1. **Removed getSamplePlans()**: No more mock data
2. **Enhanced validation**: Strict filtering of real plans
3. **Improved MessageRenderer**: Better plan detection
4. **Added context injection**: Onboarding data integration
5. **Better error handling**: Proper "no plans" messages

## 📝 Test Instructions

1. **Run all test cases** in order
2. **Document console logs** for each test
3. **Take screenshots** of plan rendering
4. **Verify no mock data** appears anywhere
5. **Confirm database queries** are working
6. **Check onboarding context** integration

## 🎯 Next Steps

After testing:
1. **Populate database** with real insurance plans
2. **Test with real data** to verify card rendering
3. **Monitor performance** of database queries
4. **Add analytics** for plan interactions
5. **Enhance context integration** further 