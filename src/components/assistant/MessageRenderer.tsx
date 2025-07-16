"use client";

import React from 'react';
import { InsurancePlansMessage } from './InsurancePlansMessage';

interface MessageRendererProps {
  content: string;
  toolInvocations?: any[];
}

export function MessageRenderer({ content, toolInvocations }: MessageRendererProps) {
  // Check if there are tool invocations with insurance plans
  const insurancePlansInvocation = toolInvocations?.find(
    (invocation) => invocation.toolName === 'get_insurance_plans' && invocation.result?.plans
  );

  if (insurancePlansInvocation) {
    const { plans, insuranceType } = insurancePlansInvocation.result;
    
    return (
      <div className="space-y-3">
        {/* Render the text content if any */}
        {content && (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {content.split('[INSURANCE_PLANS_DISPLAY]')[0]}
          </div>
        )}
        
        {/* Render the insurance plans */}
        <InsurancePlansMessage 
          plans={plans} 
          category={insuranceType}
        />
      </div>
    );
  }

  // Default text rendering
  return <p className="text-sm">{content}</p>;
} 