# Step 1: Strongly-Typed Data Contracts

## Overview
Added strongly-typed data contracts for briefing and comparison workflow without changing existing behavior.

## New Files Created

### `src/types/brief.ts`
- `BriefSource`: Union type for brief sources ('paste'|'upload'|'manual'|'url')
- `Brief`: Complete interface for briefing data with locale, category, budget, coverages, etc.
- `ProposalBrief`: Compatibility alias for existing `Brief` type from `state/proposal.ts`

### `src/types/compare.ts`
- `TemplatePlan`: Interface for template plan structure with coverages, exclusions, and sources
- `ComparedPlan`: Interface for compared plans with fit scores and coverage mapping
- `ProposalPlan`: Compatibility alias for existing `Plan` type from `state/proposal.ts`

### `src/types/case.ts`
- `CaseFile`: Interface for case management with status tracking, timeline, and reminders

### `src/types/index.ts`
- Barrel exports for all new types including compatibility aliases

## Type Overlaps Identified

### Existing Types
1. **`Brief`** in `src/state/proposal.ts`:
   ```typescript
   export type Brief = { 
     category_code: 'auto' | 'health' | 'life' | 'travel'; 
     budget_high: number; 
     must_haves: string[] 
   };
   ```
   
2. **`Plan`** in `src/state/proposal.ts`:
   ```typescript
   export type Plan = { 
     id: string; 
     name_es: string; 
     insurers: { name: string }; 
     plan_pricing: any[]; 
     plan_benefits: any[]; 
     source_url?: string; 
     last_verified_at?: string; 
     analysis?: any 
   };
   ```

### Compatibility Strategy
- Created `ProposalBrief` alias to match existing `Brief` from proposal state
- Created `ProposalPlan` alias to match existing `Plan` from proposal state
- No breaking changes to existing code
- Path aliases use `@/types/*` pattern

## Integration Notes
- All new types are accessible via `@/types` path alias
- Compatibility aliases maintain existing behavior
- No call-site refactoring required
- Types are purely additive

## TypeScript Configuration
- Uses existing path aliases from `tsconfig.json`
- Leverages `@/*` pattern for clean imports
- No additional configuration needed

## Next Steps
These types provide foundation for:
1. Gradual migration from existing types
2. Enhanced type safety in briefing workflow
3. Structured comparison functionality
4. Case management features
