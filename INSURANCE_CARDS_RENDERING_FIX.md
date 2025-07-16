# Insurance Cards Rendering Fix - Additional Changes

## Errors Fixed

### 1. TypeError: safePlan.rating.toFixed is not a function
- **Issue**: The `rating` field was coming as a string from the database but the component expected a number
- **Fix**: Added `parseFloat(plan.rating)` in MessageRenderer.tsx when mapping plans

### 2. Missing is_external field
- **Issue**: The NewPlanCard component needs `is_external` and `external_link` fields for the quote button
- **Fix**: Added these fields to the mapped plan object in MessageRenderer.tsx

### 3. Translation key showing instead of translated text
- **Issue**: MessageRenderer was using react-i18next while the app uses a custom translation system
- **Fix**: 
  - Changed import from `react-i18next` to `@/hooks/useTranslation`
  - Handled string interpolation manually since the custom system doesn't support it
  - Added missing translation keys to Spanish locale file

## Files Modified

1. **MessageRenderer.tsx**
   - Fixed rating to be parsed as float
   - Added is_external and external_link fields
   - Fixed translation import and interpolation

2. **src/locales/es/common.json**
   - Added missing "plans" section with all required translations

## Current Status

The insurance cards should now render properly with:
- ✅ Correct data types (rating as number)
- ✅ All required fields present
- ✅ Proper translations in Spanish
- ✅ Prices displayed in COP format
- ✅ Interactive cards instead of markdown lists 