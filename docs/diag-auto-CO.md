# Diagnosis: Auto | CO (Prices & Benefits)

## A. API snapshot
- list: data/audit/diag_api_auto_CO_list.json
- sample: data/audit/diag_api_auto_CO_sample.json

## B. DB checks
- price counts: data/audit/diag_auto_CO_price_counts.csv
- price sample: data/audit/diag_auto_CO_price_sample.csv
- benefits counts: data/audit/diag_auto_CO_benefits_counts.csv
- benefits sample: data/audit/diag_auto_CO_benefits_sample.csv

## C. Data lineage
- price mismatches (csv vs DB): data/audit/diag_auto_CO_mismatch_price.csv
- benefits mismatches (csv non-empty vs DB empty): data/audit/diag_auto_CO_mismatch_benefits.csv

## D. UI mapping
- Price uses plan.base_price and formatters.ts (COP compact)
- Benefits read from plan.benefits (localizedBenefits handles EN)

## E. Conclusion
- Root cause: Data/API mapping. Prices are varied per CSV; benefits empty in DB due to staging insert as []. UI reads correct fields.
- Fallback not used when DB > 0.
