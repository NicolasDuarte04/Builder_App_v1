import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { queryInsurancePlans } from '@/lib/render-db';
import { InsurancePlan } from '@/types/project';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSystemPrompt, logPromptVersion, PROMPT_VERSION } from '@/config/systemPrompt';
import { franc } from 'franc-min';

export const runtime = 'nodejs';

const hasValidKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-');

// Language detection function
function detectLanguage(text: string): 'english' | 'spanish' {
  if (!text || text.trim().length === 0) return 'english'; // default to English
  
  const detected = franc(text);
  console.log('🔍 Language detection:', { text: text.substring(0, 50) + '...', detected });
  
  // franc returns language codes like 'eng', 'spa', etc.
  if (detected === 'eng') return 'english';
  if (detected === 'spa') return 'spanish';
  
  // For uncertain detections, check for Spanish indicators
  const spanishIndicators = /\b(el|la|los|las|de|del|en|con|para|por|que|es|son|un|una|y|o|pero|como|más|muy|todo|todos|esta|este|esto|esa|ese|eso|hola|gracias|por favor|buenos días|buenas tardes|buenas noches|seguro|seguros|necesito|quiero|ayuda|auto|salud|vida|hogar|viaje)\b/i;
  const hasSpanishWords = spanishIndicators.test(text);
  
  // Check for Spanish punctuation patterns (¿, ¡)
  const hasSpanishPunctuation = /[¿¡]/.test(text);
  
  // Check for English indicators
  const englishIndicators = /\b(the|and|or|but|for|with|from|this|that|these|those|have|has|had|will|would|could|should|can|may|might|insurance|help|need|want|car|health|life|home|travel)\b/i;
  const hasEnglishWords = englishIndicators.test(text);
  
  // Decision logic
  if (hasSpanishWords || hasSpanishPunctuation) return 'spanish';
  if (hasEnglishWords) return 'english';
  
  // Default to English for very short or unclear messages
  return 'english';
}

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
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    promptVersion: PROMPT_VERSION
  });

  // Log prompt version for tracking
  logPromptVersion();

  // Get user context from the last message if available
  const lastMessage = messages[messages.length - 1];
  const userContent = lastMessage.content || '';

  // Simple check for ambiguous queries
  const isAmbiguous = userContent.trim().length < 15 && !userContent.match(/(auto|salud|vida|hogar|viaje|empresarial|mascotas|educacion)/i);

  if (isAmbiguous) {
    // Manually guide the AI to ask a clarifying question
    messages.push({
      role: 'assistant',
      content: 'The user query is too short. Ask a clarifying question to understand what type of insurance they need.'
    });
  }
  const userContext = lastMessage.role === 'system' ? lastMessage.content : '';

  // Detect language from the last user message
  const userLanguage = lastMessage.role === 'user' ? detectLanguage(lastMessage.content) : 'english';
  console.log('🌐 Detected user language:', userLanguage);

  // Get system prompt from configuration and add language instruction
  const baseSystemPrompt = getSystemPrompt(userContext);
  const languageInstruction = userLanguage === 'english' 
    ? '\n\nIMPORTANT: The user is speaking in English. Always respond in English.'
    : '\n\nIMPORTANT: The user is speaking in Spanish. Always respond in Spanish.';
  
  const systemPrompt = baseSystemPrompt + languageInstruction;

  // Development / invalid-key fallback -------------------------------------------------
  if (!hasValidKey) {
    console.warn('⚠️  OPENAI_API_KEY missing or invalid – using mock reply');

    const mockReply = userLanguage === 'english' 
      ? 'Hello! I\'m Briki, your insurance assistant. How can I help you today? (mock response)'
      : '¡Hola! Soy Briki, tu asistente de seguros. ¿En qué puedo ayudarte hoy? (respuesta simulada)';

    const stream = createMockStream(mockReply);

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
            category: z.string().describe(
              'The category of insurance. Available options are: auto, salud, vida, hogar, viaje, empresarial, mascotas, educacion.'
            ),
            max_price: z
              .number()
              .optional()
              .describe('The maximum base price the user is willing to pay.'),
            country: z
              .string()
              .optional()
              .describe('The country code (e.g., CO for Colombia).'),
            tags: z
              .array(z.string())
              .optional()
              .describe(
                'A list of tags to filter by. For example, ["popular", "completo"] to find popular or complete plans.'
              ),
            benefits_contain: z
              .string()
              .optional()
              .describe(
                'A keyword to search for within the benefits description. For example, "portátil" to find plans covering laptops.'
              ),
          }),
          execute: async ({
            category,
            max_price,
            country,
            tags,
            benefits_contain,
          }) => {
            try {
              console.log('✅✅✅ TOOL EXECUTION STARTED ✅✅✅');
              console.log('Received parameters:', {
                category,
                max_price,
                country,
                tags,
                benefits_contain,
              });

              const plans = await queryInsurancePlans({
                category,
                max_price,
                country,
                tags,
                benefits_contain,
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

    const errorReply = userLanguage === 'english'
      ? 'Sorry, there was a problem contacting the model. (mock response)'
      : 'Lo siento, hubo un problema al contactar con el modelo. (respuesta simulada)';

    const stream = createMockStream(errorReply);

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