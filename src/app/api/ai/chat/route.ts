import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { searchPlans } from '@/lib/plans-client';
import { hasDatabaseUrl } from '@/lib/render-db';
import { InsurancePlan } from '@/types/project';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSystemPrompt, logPromptVersion, PROMPT_VERSION } from '@/config/systemPrompt';
import { franc } from 'franc-min';
import { logToolError } from '@/lib/ai-error-handler';
import { mapUserInputToCategory, getCategorySuggestions, getDynamicCategories } from '@/lib/category-mapper';

export const runtime = 'nodejs';
// Disable caching to ensure fresh execution and visible logs in prod
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const preferredRegion = 'iad1';

// Bundle timestamp – helps confirm the deployed code version
console.error('[chat] bundle-loaded', { build: '2025-08-11T16:30Z' });

const key = process.env.OPENAI_API_KEY || '';
const hasValidKey = !!key && key.startsWith('sk-');
console.error('[chat] key check', { keyLen: key.length, startsWithSk: key.startsWith('sk-') });

if (!hasValidKey) {
  console.error('[chat] EARLY-EXIT: missing/invalid OPENAI_API_KEY');
}

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
  console.error('[chat] boot', { runtimeEnv: process.env.NEXT_RUNTIME || 'node' });
  // --- DEBUG: begin ---
  const mask = (url?: string) => {
    if (!url) return 'none';
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.hostname}...`;
    } catch {
      return 'invalid';
    }
  };
  const len = (s?: string) => (s ? s.length : 0);

  console.log('[chat] request:start', {
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV,
    hasDbUrl: !!(process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL),
    dbUrlLen: len(process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL),
    supabaseUrlLen: len(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
  // --- DEBUG: end ---
  let bodyJson: any = {};
  try { bodyJson = await req.json(); } catch { /* ignore */ }
  if (!bodyJson?.messages) {
    console.log('[chat] EARLY-EXIT invalid request body');
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { messages, preferredLanguage } = bodyJson;

  // Query param parsing
  const urlParams = new URL(req.url).searchParams;
  const noStream = urlParams.get('nostream') === '1';

  console.log('🔵 Chat API called with:', {
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1]?.content?.substring(0, 50) + '...',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    promptVersion: PROMPT_VERSION,
    preferredLanguage: preferredLanguage || 'not set'
  });

  // Log prompt version for tracking
  logPromptVersion();

  // Get user context from the last message if available
  const lastMessage = messages[messages.length - 1];
  const userContent = lastMessage.content || '';

  // Check if this is a greeting or casual interaction
  const greetings = ['hi', 'hello', 'hey', 'hola', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal', 'how are you', 'cómo estás'];
  const isGreeting = greetings.some(g => userContent.toLowerCase().includes(g));
  
  // Check if this is a help request
  const helpRequests = ['help', 'ayuda', 'ayúdame', 'necesito ayuda', 'qué puedes hacer'];
  const isHelpRequest = helpRequests.some(h => userContent.toLowerCase().includes(h));
  
  // Only treat as ambiguous if it's not a greeting, help request, or insurance-related
  const isAmbiguous = userContent.trim().length < 15 && 
                      !userContent.match(/(auto|salud|vida|hogar|viaje|empresarial|mascotas|educacion)/i) &&
                      !isGreeting && 
                      !isHelpRequest;

  if (isAmbiguous) {
    // Only guide to insurance if it's truly ambiguous (not a greeting)
    messages.push({
      role: 'assistant',
      content: 'The user query is too short. Ask a clarifying question to understand what they need.'
    });
  }
  // Look for system messages in the entire message array
  const systemMessage = messages.find((m: any) => m.role === 'system');
  const userContext = systemMessage ? systemMessage.content : '';
  
  // Log if we found a system message with context
  if (userContext) {
    console.log('🎯 Found system message with user context:', userContext.substring(0, 100) + '...');
  }

  // Detect language with priority order:
  // 1. Navbar language preference (if set)
  // 2. Explicit language switch in message
  // 3. Auto-detect from message content
  // 4. Default to Spanish
  
  let userLanguage: 'english' | 'spanish' = 'spanish';
  
  // First priority: Use navbar language preference if available
  if (preferredLanguage) {
    userLanguage = preferredLanguage === 'en' ? 'english' : 'spanish';
    console.log('🌐 Using navbar language preference:', userLanguage);
  }
  
  // Check for explicit language switch in the last user message (can override navbar)
  const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
  if (lastUserMessage) {
    const lastContent = lastUserMessage.content.toLowerCase().trim();
    // More comprehensive English detection
    if (lastContent.includes('english') || 
        lastContent.includes('inglés') || 
        lastContent.includes('ingles') ||
        lastContent.includes('in english') ||
        lastContent === 'en') {
      userLanguage = 'english';
      console.log('🌐 Explicit switch to English per user request');
    } else if (lastContent.includes('español') || 
               lastContent.includes('espanol') || 
               lastContent.includes('spanish') ||
               lastContent.includes('en español') ||
               lastContent === 'es') {
      userLanguage = 'spanish';
      console.log('🌐 Explicit switch to Spanish per user request');
    } else if (!preferredLanguage) {
      // Only auto-detect if no navbar preference is set
      // Check if there's onboarding context - if it's in Spanish, keep Spanish
      if (userContext && userContext.includes('Ciudad:')) {
        userLanguage = 'spanish';
        console.log('🌐 Using Spanish based on onboarding context');
      } else {
        // Look through all user messages to detect the predominant language
        const userMessages = messages.filter((m: any) => m.role === 'user');
        if (userMessages.length > 0) {
          // Check if any assistant messages exist - maintain their language
          const assistantMessages = messages.filter((m: any) => m.role === 'assistant');
          if (assistantMessages.length > 0 && assistantMessages[0].content) {
            // If assistant already spoke Spanish, keep Spanish
            if (assistantMessages[0].content.includes('¡') || assistantMessages[0].content.includes('¿')) {
              userLanguage = 'spanish';
            } else {
              // Otherwise detect from user messages
              const firstUserMessage = userMessages[0];
              userLanguage = detectLanguage(firstUserMessage.content);
              
              // If first message is ambiguous (like "no" or "sí"), default to Spanish
              if (firstUserMessage.content.trim().length < 20) {
                userLanguage = 'spanish'; // Default to Spanish for short messages
              }
            }
          } else {
            // No assistant messages yet, detect from user
            const firstUserMessage = userMessages[0];
            const messageContent = firstUserMessage.content.toLowerCase();
            
            // Check for clear English indicators first
            if (messageContent.includes('how are you') || 
                messageContent.includes('hi briki') ||
                messageContent.includes('hello') ||
                messageContent.includes('can you') ||
                messageContent.includes('what') ||
                messageContent.includes('please') ||
                messageContent.includes('thanks') ||
                messageContent.includes('help me')) {
              userLanguage = 'english';
              console.log('🌐 Detected English from message patterns');
            } else {
              userLanguage = detectLanguage(firstUserMessage.content);
              
              // Default to Spanish for ambiguous short messages ONLY if not clearly English
              if (firstUserMessage.content.trim().length < 20 && userLanguage !== 'english') {
                userLanguage = 'spanish';
              }
            }
          }
        }
      }
    }
  }
  
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

  if (noStream) {
    console.error('[chat] nostream fallback engaged');
    // For simplicity use the last user message as category text
    const catText = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
    const mapped = await mapUserInputToCategory(catText);
    const plans = await searchPlans({ category: mapped.category || catText, limit: 4 });
    return NextResponse.json({ tools: { insurance_plans: { plans, insuranceType: mapped.category || catText } } });
  }

  console.error('[chat] passed key guard; building streamText');

  // Real OpenAI call ------------------------------------------------------------------
  try {
    console.log('[chat] about to streamText', { mappedCategoryAttempt: 'will log later' });
    const oai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Get dynamic categories for the tool description
    const availableCategories = await getDynamicCategories();
    const categoryList = availableCategories.join(', ');

    const result = await streamText({
      model: oai('gpt-3.5-turbo'),
      system: systemPrompt,
      messages,
      tools: {
        get_insurance_plans: tool({
          description: 'Get a list of insurance plans based on user criteria.',
          parameters: z.object({
            category: z.string().describe(
              `The category of insurance. Available categories from database: ${categoryList}. Also accepts natural language like "business insurance" which will be mapped to the correct category.`
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
              console.error('[tool] START get_insurance_plans', {
                cat: category,
                max_price,
                country,
                plansApiLen: (process.env.NEXT_PUBLIC_PLANS_API_URL || process.env.PLANS_API_URL || '').length,
                dbUrlLen: (process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL || '').length,
              });
              
              // Map natural language to actual category
              const categoryMapping = await mapUserInputToCategory(category);
              const actualCategory = categoryMapping.category || category;
              
              console.log('🗺️ Category mapping:', {
                userInput: category,
                mappedCategory: actualCategory,
                confidence: categoryMapping.confidence,
                availableCategories: categoryMapping.availableCategories
              });

              console.log('🔍 Database connection status:', {
                hasDatabaseUrl,
                envVarSet: !!(process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL),
                envVarLength: (process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL)?.length || 0,
              });

              const dbUrlLength = (process.env.DATABASE_URL || '').length;
              const renderUrlLength = (process.env.RENDER_POSTGRES_URL || '').length;
              console.error('[chat] env lengths:', { dbUrlLength, renderUrlLength });
              console.error('[chat] filters:', { category: actualCategory, country, max_price });
              const t0 = Date.now();
              const plans = await searchPlans({
                category: actualCategory,
                max_price,
                country,
                tags,
                benefits_contain,
                limit: 4,
              });
              const firstPlanInfo = plans.length ? { provider: plans[0].provider, name: plans[0].name } : null;
              console.error('[chat] query done in', Date.now() - t0, 'ms; planCount =', plans.length, 'first:', firstPlanInfo);
              
              // Check if we got fuzzy matches (different categories)
              const isExactMatch = plans.length > 0 && plans.every(plan => 
                plan.category.toLowerCase() === category.toLowerCase()
              );
              
              console.log(`✅ Raw database response:`, {
                planCount: plans.length,
                rawPlans: plans,
                firstPlan: plans[0] || null,
                planStructure: plans[0] ? Object.keys(plans[0]) : [],
                isExactMatch
              });
              
              // Transform plans into the expected UI format
              // The frontend expects these exact fields for validation
              console.error('[tool] END get_insurance_plans', {
                planCount: plans.length,
                first: firstPlanInfo,
              });

              const finalPlans = plans.map((plan, index) => ({
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
                insuranceType: actualCategory,
                originalQuery: category,
                hasRealPlans: finalPlans.length > 0,
                isExactMatch: isExactMatch && finalPlans.length > 0,
                noExactMatchesFound: !isExactMatch && finalPlans.length > 0,
                categoriesFound: [...new Set(finalPlans.map(p => p.category))],
                availableCategories: categoryMapping.availableCategories
              };
              
              console.log('✅✅✅ TOOL EXECUTION FINISHED ✅✅✅');
              console.log('Returning to AI:', {
                planCount: finalPlans.length,
                hasRealPlans: finalPlans.length > 0,
                insuranceType: category,
                isExactMatch: toolResult.isExactMatch,
                noExactMatchesFound: toolResult.noExactMatchesFound,
                categoriesFound: toolResult.categoriesFound,
                samplePlanName: finalPlans[0]?.name
              });
              
              return toolResult;
            } catch (error) {
              console.error('❌ Error executing get_insurance_plans tool:', error);
              logToolError({ 
                toolName: 'get_insurance_plans', 
                error, 
                context: { category, max_price, country, tags, benefits_contain } 
              });
              
              // Return empty array with error flag
              const errorResult = { 
                plans: [], 
                insuranceType: category, 
                hasRealPlans: false,
                error: true,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
              };
              console.log(`📤 Error fallback result:`, errorResult);
              return errorResult;
            }
          },
        }),
      },
    });

    const planCountDebug = (result as any)?.tools?.insurance_plans?.plans?.length ?? -1;
    console.error('[chat] result:tools', {
      hasTools: !!(result as any)?.tools,
      planCount: planCountDebug,
    });

    // --- SSE peek diagnostics using Response.tee() ---
    const aiResp = result.toAIStreamResponse({ headers: { 'x-vercel-ai-data-stream': 'v1' } });
    const body = aiResp.body;
    if (!body) return aiResp;

    const [branch1, branch2] = body.tee();
    const firstReader = branch1.getReader();
    const firstChunk = await firstReader.read();
    if (firstChunk.value) {
      console.error('[chat] peek-sse', new TextDecoder().decode(firstChunk.value).slice(0, 400));
    }

    // Close the first branch completely to free resources
    firstReader.cancel();

    console.error('🟢 streamText done, returning SSE stream');
    return new NextResponse(branch2, aiResp);

  } catch (err) {
    console.error('[chat] error', {
      message: (err as any)?.message,
      code: (err as any)?.code,
    });

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