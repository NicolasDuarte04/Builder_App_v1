import { Brief } from '@/types/brief';
import { buildPlanFiltersFromBrief } from '@/lib/briefPromptBuilder';
import { searchPlans } from '@/lib/plans-client';
import { buildSmartTemplates, TemplatePlan } from '@/lib/templates/buildSmartTemplates';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { validateAndNormalizeBrief } from '@/lib/validate/brief';

export type GetPlansArgs = {
  brief: Brief | null | undefined;
  base?: string;                // server base (req.nextUrl.origin)
  override?: {                  // optional tool overrides
    category?: string;
    max_price?: number;
    benefits_contain?: string;  // comma list
    limit?: number;
  };
};

export type GetPlansResult = 
  | { type: 'plans'; plans: any[] }
  | { type: 'templates'; templates: TemplatePlan[] };

/**
 * Centralized plan fetching logic with brief-driven filters and clean fallback to templates
 */
export async function getInsurancePlans(args: GetPlansArgs): Promise<GetPlansResult> {
  const { brief, base, override = {} } = args;
  
  try {
    // Build base filters from brief
    const briefFilters = brief ? buildPlanFiltersFromBrief(validateAndNormalizeBrief(brief).brief as any) : {
      category: 'auto',
      country: 'CO' as const,
      limit: 3
    };
    
    // Merge with overrides
    const finalFilters = {
      ...briefFilters,
      base,
      ...override
    };
    
    console.log('🔍 getInsurancePlans: searching with filters', finalFilters);
    
    // Call searchPlans with merged filters
    const plans = await searchPlans(finalFilters);
    
    console.log('📊 getInsurancePlans: search result', { planCount: plans.length });
    
    // If we have plans, return them and track success
    if (plans.length > 0) {
      const { sessionId, userId } = await getUserContext();
      telemetry.track(telemetry.events.SHORTLIST_FETCHED, {
        planCount: plans.length,
        category: finalFilters.category,
        sessionId,
        userId
      });
      
      return { type: 'plans', plans };
    }
    
    // No plans found - fallback to templates
    console.log('📝 getInsurancePlans: no catalog results, generating templates');
    const templates = buildSmartTemplates(brief || null);
    
    // Note: TEMPLATES_GENERATED telemetry is now handled in showPanelWithPlans
    
    return { type: 'templates', templates };
    
  } catch (error) {
    console.error('❌ getInsurancePlans error:', error);
    
    // Track error
    const { sessionId, userId } = await getUserContext();
    telemetry.track(telemetry.events.SHORTLIST_FAILED, {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: (error as any)?.status || 'unknown',
      sessionId,
      userId
    });
    
    // Re-throw to let caller handle
    throw error;
  }
}
