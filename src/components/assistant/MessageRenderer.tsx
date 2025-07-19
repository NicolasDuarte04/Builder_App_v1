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
      if (hasValidPlansData(insurancePlanTool.result)) {
        return renderPlans(insurancePlanTool.result);
      }
    }
  }

  // Check if this is a tool result for get_insurance_plans
  if (role === 'tool' && name === 'get_insurance_plans') {
    try {
      const parsed = JSON.parse(content);
      if (hasValidPlansData(parsed)) {
        return renderPlans(parsed);
      } else {
        return renderNoPlansMessage(parsed);
      }
    } catch (error) {
      // If that fails, look for JSON within the content
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (hasValidPlansData(parsed)) {
            return renderPlans(parsed);
          } else {
            return renderNoPlansMessage(parsed);
          }
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
      if (hasValidPlansData(parsed)) {
        return renderPlans(parsed);
      } else {
        return renderNoPlansMessage(parsed);
      }
    } catch (error) {
      // If that fails, look for JSON within the content
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (hasValidPlansData(parsed)) {
            return renderPlans(parsed);
          } else {
            return renderNoPlansMessage(parsed);
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
    
    return (
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            No se encontraron planes de seguros disponibles para los criterios especificados.
          </p>
        </div>
        <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
          Intenta con diferentes parámetros o contacta directamente con las aseguradoras.
        </p>
      </div>
    );
  }
} 