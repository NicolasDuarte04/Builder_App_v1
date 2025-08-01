"use client";

import React from 'react';
import { InsurancePlansMessage } from './InsurancePlansMessage';
import { useTranslation } from '@/hooks/useTranslation';

interface MessageRendererProps {
  content: string;
  role?: string;
  name?: string;
  toolInvocations?: any[];
}

// Debug component to help identify issues
const DebugInfo = ({ content, role, name, toolInvocations }: MessageRendererProps) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
      <strong>Debug Info:</strong>
      <div>Role: {role}</div>
      <div>Name: {name}</div>
      <div>Content Preview: {content?.substring(0, 100)}...</div>
      <div>Tool Invocations: {toolInvocations ? toolInvocations.length : 0}</div>
    </div>
  );
};

export function MessageRenderer({ content, role, name, toolInvocations }: MessageRendererProps) {
  const { t } = useTranslation();

  // Helper function to check if content contains valid plans data
  const hasValidPlansData = (data: any): boolean => {
    return data && 
           Array.isArray(data.plans) && 
           data.plans.length > 0 && 
           data.plans.some((plan: any) => 
             plan && 
             plan.name && 
             plan.name !== 'No hay planes disponibles públicamente' &&
             plan.name !== 'Plan de Seguro' &&
             plan.provider &&
             plan.provider !== 'Proveedor' &&
             plan.base_price > 0 &&
             plan.external_link
           );
  };

  // Check if we have tool invocations for insurance plans
  if (toolInvocations && toolInvocations.length > 0) {
    const insurancePlanTool = toolInvocations.find(
      (tool: any) => tool.toolName === 'get_insurance_plans' && tool.result
    );
    
    if (insurancePlanTool && insurancePlanTool.result) {
      // Always render the component, let it handle empty states
      return renderPlansOrEmptyState(insurancePlanTool.result);
    }
  }

  // Check if this is a tool result for get_insurance_plans
  if (role === 'tool' && name === 'get_insurance_plans') {
    try {
      const parsed = JSON.parse(content);
      return renderPlansOrEmptyState(parsed);
    } catch (error) {
      // If that fails, look for JSON within the content
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return renderPlansOrEmptyState(parsed);
        }
      } catch (err) {
        // console.warn('⚠️ Assistant content JSON parse failed:', err);
      }
    }
  }

  // Check if this is an assistant message with tool results
  if (role === 'assistant') {
    // Look for tool results in the message content
    try {
      // First, try to parse the entire content as JSON
      const parsed = JSON.parse(content);
      if (parsed.type === 'insurance_plans' || parsed.plans !== undefined) {
        return renderPlansOrEmptyState(parsed);
      }
    } catch (error) {
      // If that fails, look for JSON within the content
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.type === 'insurance_plans' || parsed.plans !== undefined) {
            return renderPlansOrEmptyState(parsed);
          }
        }
      } catch (err) {
        // console.warn('⚠️ Assistant content JSON parse failed:', err);
      }
    }
  }

  // Default text rendering
  return (
    <div>
      <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
    </div>
  );

  // --- helper functions ---
  function renderPlans(parsed: { plans: any[] }) {
    const plans = parsed.plans;
    
    // Filter out invalid plans (like "No hay planes disponibles públicamente")
    const validPlans = plans.filter((plan: any) => 
      plan && 
      plan.name && 
      plan.name !== 'No hay planes disponibles públicamente' &&
      plan.name !== 'Plan de Seguro' &&
      plan.provider &&
      plan.provider !== 'Proveedor' &&
      plan.base_price > 0 &&
      plan.external_link
    );
    
    if (validPlans.length === 0) {
      return renderNoPlansMessage(parsed);
    }
    
    const mappedPlans = validPlans.map((plan: any, index: number) => {
      const tags: string[] = [];
      if (index === 0) tags.push(t('plans.tags.recommended'));
      if (plan.base_price && plan.base_price > 0 && plan.base_price < 150000) {
        tags.push(t('plans.tags.bestValue'));
      }
      
      return {
        id: plan.id?.toString() ?? index.toString(),
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
    
    const category = mappedPlans[0]?.category ?? t('plans.defaultCategory');
    const titleTemplate = t('plans.recommendedTitle');
    const title = titleTemplate.replace('{category}', category);
    
    const suggestedPlans = {
      title,
      plans: mappedPlans,
    };
    
    return (
      <div className="flex flex-col space-y-2">
        <InsurancePlansMessage suggestedPlans={suggestedPlans} />
      </div>
    );
  }

  function renderNoPlansMessage(parsed: any) {
    const category = parsed.insuranceType || 'seguros';
    
    return (
      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start space-x-3">
          <div className="mt-1">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              No encontramos planes de {category} con esos criterios
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Intenta ajustar tus filtros o pregúntame por otros tipos de seguros. 
              También puedo ayudarte a comparar planes o analizar tu póliza actual.
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderPlansOrEmptyState(parsed: any) {
    // Check if we have valid plans data structure
    if (!parsed || typeof parsed !== 'object') {
      return renderNoPlansMessage(parsed);
    }

    // Extract plans array - could be in different locations
    const plans = parsed.plans || [];
    
    // Filter valid plans
    const validPlans = plans.filter((plan: any) => 
      plan && 
      plan.name && 
      plan.name !== 'No hay planes disponibles públicamente' &&
      plan.name !== 'Plan de Seguro' &&
      plan.provider &&
      plan.provider !== 'Proveedor' &&
      plan.base_price > 0 &&
      plan.external_link
    );

    // If no valid plans, show empty state
    if (validPlans.length === 0) {
      return renderNoPlansMessage(parsed);
    }

    // Otherwise render the plans
    return renderPlans({ ...parsed, plans: validPlans });
  }
} 