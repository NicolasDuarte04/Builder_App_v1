import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { queryInsurancePlans, getInsuranceTypes } from '@/lib/render-db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const hasValidKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-');

const oai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});



export async function POST(req: Request) {
  const { messages } = await req.json();
  const encoder = new TextEncoder();

  console.log('🔵 Chat API called with:', {
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1]?.content?.substring(0, 50) + '...',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY
  });

  const systemPrompt = `You are Briki, an AI insurance assistant. 

CAPABILITIES:
1. Insurance Plan Recommendations - Use tool: get_insurance_plans
2. Policy Analysis - Coming soon
3. Coverage Comparison - Coming soon

WHEN USERS ASK FOR INSURANCE RECOMMENDATIONS:
1. Ask for insurance type if not provided (salud, vida, auto, hogar, viaje, empresarial)
2. Ask for budget if not provided
3. Use get_insurance_plans tool with their preferences
4. Present the results in a friendly, helpful way
5. Explain the key benefits of each plan
6. Offer to help them get a quote or learn more

GUIDELINES:
- Be friendly, knowledgeable, and helpful in Spanish and English
- Focus on providing clear, accurate information about insurance products
- Help users understand policy terms, coverage limits, deductibles, and exclusions
- When comparing policies, highlight key differences in coverage, cost, and benefits
- Always respond in the user's preferred language (Spanish or English)
- Be encouraging and supportive while providing professional insurance guidance
- If users mention specific needs (family coverage, international coverage, etc.), include those in your recommendations

IMPORTANT: When showing insurance plans, format your response clearly with an introduction, then say "Here are the recommended plans:" followed by [INSURANCE_PLANS_DISPLAY] to indicate where the plans should be shown.`;

  // Development / invalid-key fallback -------------------------------------------------
  if (!hasValidKey) {
    console.warn('⚠️  OPENAI_API_KEY missing or invalid – using mock reply');

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ role: 'assistant', content: '¡Hola! (respuesta simulada)' })}\n\n`
          ),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // Real OpenAI call ------------------------------------------------------------------
  try {
    const oai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await streamText({
      model: oai('gpt-4-turbo-preview'),
      system: systemPrompt,
      messages,
      tools: {
        get_insurance_plans: {
          description: 'Get insurance plan recommendations based on user preferences',
          parameters: {
            type: 'object',
            properties: {
              insuranceType: {
                type: 'string',
                description: 'Type of insurance (salud, vida, auto, hogar, viaje, empresarial)',
                enum: ['salud', 'vida', 'auto', 'hogar', 'viaje', 'empresarial']
              },
              budget: {
                type: 'number',
                description: 'Maximum monthly premium budget'
              },
              preferences: {
                type: 'array',
                items: { type: 'string' },
                description: 'Additional preferences or requirements'
              }
            },
            required: ['insuranceType']
          },
          execute: async ({ insuranceType, budget, preferences }: any) => {
            try {
              console.log('🔍 Tool call: get_insurance_plans', { insuranceType, budget, preferences });
              
              const plans = await queryInsurancePlans({
                type: insuranceType,
                maxPremium: budget,
                preferences: preferences || [],
                limit: 4
              });

              console.log(`✅ Found ${plans.length} plans for ${insuranceType}`);
              
              // Return a structured response that can be rendered in the chat
              return {
                type: 'insurance_plans',
                plans: plans.map(plan => ({
                  id: parseInt(plan.id),
                  name: plan.plan_name,
                  category: plan.insurance_type || insuranceType,
                  provider: plan.provider,
                  basePrice: plan.monthly_premium || 0,
                  currency: 'COP',
                  benefits: plan.coverage_summary ? [plan.coverage_summary] : [],
                  isExternal: !!plan.quote_link,
                  externalLink: plan.quote_link || null,
                  features: plan.coverage_details ? Object.keys(plan.coverage_details) : []
                })),
                count: plans.length,
                insuranceType,
                budget
              };
            } catch (error) {
              console.error('❌ Error in get_insurance_plans tool:', error);
              return {
                error: 'Failed to get insurance plans',
                details: error instanceof Error ? error.message : 'Unknown error'
              };
            }
          }
        }
      }
    });

    return result.toDataStreamResponse();
  } catch (err) {
    console.error('🔴 streamText failed –', err);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ role: 'assistant', content: 'Lo siento, hubo un problema al contactar con el modelo. (respuesta simulada)' })}\n\n`
          ),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }
} 