import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { queryInsurancePlans } from '@/lib/render-db';
import { InsurancePlan } from '@/types/project';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const hasValidKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-');

// Mock model for fallback responses
function createMockStream(reply: string) {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ role: 'assistant', content: reply, index: 0 })}\n\n`)
      );
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ stop_reason: 'stop', index: 0 })}\n\n`)
      );
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

// Remove the getSamplePlans function entirely - we don't want any mock data
// const getSamplePlans = (category: string) => { ... } - REMOVED

export async function POST(req: Request) {
  const { messages } = await req.json();
  const encoder = new TextEncoder();

  console.log('🔵 Chat API called with:', {
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1]?.content?.substring(0, 50) + '...',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY
  });

  // Get user context from the last message if available
  const lastMessage = messages[messages.length - 1];
  const userContext = lastMessage.role === 'system' ? lastMessage.content : '';

  const systemPrompt = `You are Briki, an AI insurance assistant. 
${userContext ? `The user has provided the following context from an onboarding form: ${userContext}. Use this information to tailor your recommendations.` : ''}

CAPABILITIES:
1. Category Detection:
   - Automatically detect insurance categories from user messages:
     - "seguro de viaje" → category: "viaje"
     - "seguro de salud" → category: "salud"
     - "seguro médico" → category: "salud"
     - "seguro dental" → category: "salud"
     - "seguro de vida" → category: "vida"
     - "seguro de auto" → category: "auto"
     - "seguro de carro" → category: "auto"
     - "seguro de hogar" → category: "hogar"
     - "seguro de casa" → category: "hogar"
   - Only ask for category if it cannot be clearly inferred from the user's message

2. Plan Display:
   - When you receive tool results with insurance plans, present them in a user-friendly way
   - The tool will provide the plans data automatically - you don't need to format it as JSON
   - Simply describe the plans in natural language, highlighting their key features
   - Focus on the benefits, prices, and how each plan meets the user's needs
   - Never return plans as a markdown list or table
   - Always mention that users can see interactive cards with the plans

3. Currency Display:
   - Always display Colombian prices in COP, not USD
   - Format large numbers with commas: 1,000,000 COP
   - Use the formatted price fields from the database

4. Language:
   - Respond in the same language as the user's message (Spanish or English)
   - Be warm and helpful, but professional
   - Keep explanations brief and focused on the plans' key benefits

5. Plan Selection:
   - Recommend plans based on user's specific needs and constraints
   - Highlight key differentiators between plans
   - If budget is mentioned, filter plans accordingly
   - If specific coverage needs are mentioned, prioritize matching plans

WHEN USERS ASK FOR INSURANCE:
1. If category is missing and cannot be inferred from the message, ask for it.
2. Use the \`get_insurance_plans\` tool with the available parameters.
3. If the tool returns plans (\`hasRealPlans: true\`), describe them conversationally and mention that the interactive cards are displayed below.
4. If the tool returns no plans (\`hasRealPlans: false\`), inform the user that no plans were found for their criteria and suggest they try different options.`;

  // Development / invalid-key fallback -------------------------------------------------
  if (!hasValidKey) {
    console.warn('⚠️  OPENAI_API_KEY missing or invalid – using mock reply');

    const stream = createMockStream('¡Hola! Soy Briki, tu asistente de seguros. ¿En qué puedo ayudarte hoy? (respuesta simulada)');

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
      model: oai('gpt-3.5-turbo'),
      system: systemPrompt,
      messages,
      tools: {
        get_insurance_plans: tool({
          description: 'Get a list of insurance plans based on user criteria.',
          parameters: z.object({
            category: z.string().describe('The category of insurance (e.g., salud, vida, auto, hogar, viaje, empresarial).'),
            max_price: z.number().optional().describe('The maximum base price the user is willing to pay.'),
            country: z.string().optional().describe('The country code (e.g., CO for Colombia).')
          }),
          execute: async ({ category, max_price, country }) => {
            try {
              console.log('✅✅✅ TOOL EXECUTION STARTED ✅✅✅');
              console.log('Received parameters:', { category, max_price, country });
              
              const plans = await queryInsurancePlans({
                category,
                max_price,
                country,
                limit: 4,
              });
              
              console.log(`✅ Raw database response:`, {
                planCount: plans.length,
                rawPlans: plans,
                firstPlan: plans[0] || null,
                planStructure: plans[0] ? Object.keys(plans[0]) : []
              });
              
              // STRICT VALIDATION: Only return plans that are real and complete
              const validPlans = plans.filter(plan => 
                plan && 
                plan.name && 
                plan.name !== 'No hay planes disponibles públicamente' &&
                plan.name !== 'Plan de Seguro' &&
                plan.provider &&
                plan.provider !== 'Proveedor' &&
                plan.base_price > 0 && // Must have a real price
                plan.external_link // Must have an external link for quotes
              );
              
              console.log(`🔍 Validation results:`, {
                totalPlans: plans.length,
                validPlans: validPlans.length,
                invalidPlans: plans.length - validPlans.length,
                reasons: plans.map(plan => ({
                  name: plan.name,
                  provider: plan.provider,
                  base_price: plan.base_price,
                  external_link: plan.external_link,
                  isValid: plan.name && 
                           plan.name !== 'No hay planes disponibles públicamente' &&
                           plan.provider &&
                           plan.base_price > 0 &&
                           plan.external_link
                }))
              });
              
              // Transform plans into the expected UI format
              // The frontend expects these exact fields for validation
              const finalPlans = validPlans.map((plan, index) => ({
                id: plan.id,
                name: plan.name,
                provider: plan.provider,
                base_price: plan.base_price, // numeric value required
                base_price_formatted: plan.base_price_formatted,
                currency: plan.currency,
                benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
                category: plan.category,
                rating: plan.rating,
                external_link: plan.external_link,
                is_external: plan.is_external
              }));
              
              const toolResult = { 
                type: "insurance_plans",
                plans: finalPlans,
                insuranceType: category,
                hasRealPlans: finalPlans.length > 0,
              };
              
              console.log('✅✅✅ TOOL EXECUTION FINISHED ✅✅✅');
              console.log('Returning to AI:', {
                planCount: finalPlans.length,
                hasRealPlans: finalPlans.length > 0,
                insuranceType: category,
                samplePlanName: finalPlans[0]?.name
              });
              
              return toolResult;
            } catch (error) {
              console.error('❌ Error executing get_insurance_plans tool:', error);
              // Return empty array instead of sample data
              const errorResult = { plans: [], insuranceType: category, hasRealPlans: false };
              console.log(`📤 Error fallback result:`, errorResult);
              return errorResult;
            }
          },
        }),
      },
    });

    console.dir({ resultDebug: result }, { depth: 4 });
    console.log('🟢 streamText result obtained, converting to DataStreamResponse');
    return result.toDataStreamResponse();

  } catch (err) {
    console.error(' streamText failed –', err);

    const stream = createMockStream('Lo siento, hubo un problema al contactar con el modelo. (respuesta simulada)');

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