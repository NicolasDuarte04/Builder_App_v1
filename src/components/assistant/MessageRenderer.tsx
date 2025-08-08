"use client";

import React, { useEffect } from 'react';
import { useRightPanelTrigger } from '@/contexts/PlanResultsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { ComparisonMessage } from './ComparisonMessage';

interface MessageRendererProps {
  content: string;
  role?: string;
  name?: string;
  toolInvocations?: any[];
}

export const MessageRenderer = React.memo(function MessageRenderer({ 
  content, 
  role, 
  name, 
  toolInvocations 
}: MessageRendererProps) {
  const { t } = useTranslation();
  const { showPanelWithPlans, isDualPanelMode } = useRightPanelTrigger();

  // Effect to detect and emit plan data to the right panel
  useEffect(() => {
    // Check tool invocations first (priority)
    if (toolInvocations && toolInvocations.length > 0) {
      const insurancePlanTool = toolInvocations.find(
        (tool: any) => tool.toolName === 'get_insurance_plans' && tool.result
      );
      
      if (insurancePlanTool?.result) {
        // Check for category mismatch
        const result = insurancePlanTool.result;
        const isCategoryMismatch = result.noExactMatchesFound && 
                                   result.insuranceType && 
                                   result.categoriesFound && 
                                   !result.categoriesFound.includes(result.insuranceType);
        
        if (isCategoryMismatch) {
          console.log('🚫 MessageRenderer: Blocking irrelevant plans');
          return; // Don't process these plans
        }
        
        handlePlanData(insurancePlanTool.result);
        return;
      }
    }

    // Check if this is a tool result message
    if (role === 'tool' && name === 'get_insurance_plans') {
      try {
        const parsed = JSON.parse(content);
        
        // Check for category mismatch
        const isCategoryMismatch = parsed.noExactMatchesFound && 
                                   parsed.insuranceType && 
                                   parsed.categoriesFound && 
                                   !parsed.categoriesFound.includes(parsed.insuranceType);
        
        if (isCategoryMismatch) {
          console.log('🚫 MessageRenderer: Blocking irrelevant plans from tool result');
          return; // Don't process these plans
        }
        
        handlePlanData(parsed);
        return;
      } catch (error) {
        // Try to extract JSON from content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Check for category mismatch
            const isCategoryMismatch = parsed.noExactMatchesFound && 
                                       parsed.insuranceType && 
                                       parsed.categoriesFound && 
                                       !parsed.categoriesFound.includes(parsed.insuranceType);
            
            if (isCategoryMismatch) {
              return; // Don't process these plans
            }
            
            handlePlanData(parsed);
            return;
          } catch (err) {
            console.warn('Failed to parse plan data from tool result');
          }
        }
      }
    }

    // Check assistant messages for embedded plan data (only insurance_plans, not comparison)
    if (role === 'assistant') {
      try {
        const parsed = JSON.parse(content);
        // Only treat explicit insurance_plans payloads as structured plan data
        if (parsed.type === 'insurance_plans') {
          // Check for category mismatch
          const isCategoryMismatch = parsed.noExactMatchesFound && 
                                     parsed.insuranceType && 
                                     parsed.categoriesFound && 
                                     !parsed.categoriesFound.includes(parsed.insuranceType);
          
          if (isCategoryMismatch) {
            return; // Don't process these plans
          }
          
          handlePlanData(parsed);
          return;
        }
      } catch (error) {
        // Try to extract JSON from content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.type === 'insurance_plans') {
              // Check for category mismatch
              const isCategoryMismatch = parsed.noExactMatchesFound && 
                                         parsed.insuranceType && 
                                         parsed.categoriesFound && 
                                         !parsed.categoriesFound.includes(parsed.insuranceType);
              
              if (isCategoryMismatch) {
                return; // Don't process these plans
              }
              
              handlePlanData(parsed);
              return;
            }
          } catch (err) {
            // Not plan data, render as normal text
          }
        }
      }
    }
  }, [content, role, name, toolInvocations]);

  // Handle plan data emission to right panel
  const handlePlanData = (data: any) => {
    if (!data || !Array.isArray(data.plans)) return;

    // Filter and validate plans
    const validPlans = data.plans.filter((plan: any) => 
      plan && 
      plan.name && 
      plan.name !== 'No hay planes disponibles públicamente' &&
      plan.name !== 'Plan de Seguro' &&
      plan.provider &&
      plan.provider !== 'Proveedor' &&
      plan.base_price > 0 &&
      plan.external_link
    );

    if (validPlans.length === 0) return;

    // Map plans to the expected format
    const mappedPlans = validPlans.map((plan: any, index: number) => {
      const tags: string[] = [];
      if (index === 0) tags.push(t('plans.tags.recommended'));
      if (plan.base_price && plan.base_price > 0 && plan.base_price < 150000) {
        tags.push(t('plans.tags.bestValue'));
      }
      
      return {
        id: plan.id ?? index,
        name: plan.name || 'Plan de Seguro',
        provider: plan.provider || 'Proveedor',
        basePrice: plan.base_price || 0,
        currency: plan.currency || 'COP',
        benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
        externalLink: plan.external_link,
        external_link: plan.external_link,
        is_external: plan.is_external !== undefined ? plan.is_external : true,
        category: plan.category || 'seguro',
        rating: parseFloat(plan.rating) || 4.0,
        tags,
      };
    });

    // Prepare plan results data
    const category = mappedPlans[0]?.category ?? t('plans.defaultCategory');
    const titleTemplate = t('plans.recommendedTitle');
    const title = titleTemplate.replace('{category}', category);
    
    const planResults = {
      title,
      plans: mappedPlans,
      category,
      query: data.query || undefined,
    };

    // Emit to right panel (if in dual panel mode)
    if (isDualPanelMode) {
      console.log('🎯 GEMINI-STYLE: Emitting plans to right panel:', planResults);
      showPanelWithPlans(planResults);
    }
  };

  // Check if this message contains plan data
  const containsPlanData = () => {
    // Check tool invocations
    if (toolInvocations?.some((tool: any) => {
      if (tool.toolName === 'get_insurance_plans' && tool.result?.plans?.length > 0) {
        // Check for category mismatch
        const result = tool.result;
        const isCategoryMismatch = result.noExactMatchesFound && 
                                   result.insuranceType && 
                                   result.categoriesFound && 
                                   !result.categoriesFound.includes(result.insuranceType);
        
        return !isCategoryMismatch; // Only return true if NOT a mismatch
      }
      return false;
    })) {
      return true;
    }

    // Check tool results
    if (role === 'tool' && name === 'get_insurance_plans') {
      try {
        const parsed = JSON.parse(content);
        // Check for category mismatch
        const isCategoryMismatch = parsed.noExactMatchesFound && 
                                   parsed.insuranceType && 
                                   parsed.categoriesFound && 
                                   !parsed.categoriesFound.includes(parsed.insuranceType);
        
        return parsed.plans?.length > 0 && !isCategoryMismatch;
      } catch {
        return false;
      }
    }

    // Check assistant messages
    if (role === 'assistant') {
      try {
        const parsed = JSON.parse(content);
        // Only compress when it's the insurance_plans payload
        return parsed.type === 'insurance_plans' && parsed.plans?.length > 0;
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.type === 'insurance_plans' && parsed.plans?.length > 0;
          } catch {
            return false;
          }
        }
      }
    }

    return false;
  };

  // GEMINI-STYLE: If in dual panel mode and this message contains plans, 
  // show a simple notification instead of the full content
  if (isDualPanelMode && containsPlanData()) {
    return (
      <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="mt-1">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {t('assistant.plansFound')}
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            {t('assistant.checkRightPanel')}
          </p>
        </div>
      </div>
    );
  }

  // For tool messages, hide them completely in dual panel mode
  if (role === 'tool' && isDualPanelMode) {
    return null;
  }

  // Handle comparison messages
  if (role === 'assistant') {
    try {
      console.log('🔍 MessageRenderer: Attempting to parse assistant message:', content.substring(0, 100) + '...');
      const parsed = JSON.parse(content);
      console.log('🔍 MessageRenderer: Parsed message type:', parsed.type);
      
      if (parsed.type === 'comparison' && parsed.plans) {
        console.log('✅ MessageRenderer: Rendering comparison with', parsed.plans.length, 'plans');
        return (
          <ComparisonMessage
            plans={parsed.plans}
          />
        );
      }
    } catch (error) {
      console.log('🔍 MessageRenderer: Not a JSON message, continuing to default rendering');
      // Not JSON, continue to default rendering
    }
  }

  // Default text rendering for all other content
  return (
    <div>
      <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
    </div>
  );
});