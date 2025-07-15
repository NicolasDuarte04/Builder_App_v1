import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const runtime = 'edge';

const oai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  console.log('🔵 Chat API called with:', {
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1]?.content?.substring(0, 50) + '...',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY
  });

  const systemPrompt = `You are Briki, an AI insurance assistant. 
- Your primary goal is to help users with insurance-related questions and needs.
- You can help users compare insurance policies, analyze coverage, and understand insurance terms.
- Be friendly, knowledgeable, and helpful in Spanish and English.
- Focus on providing clear, accurate information about insurance products and services.
- If users ask about specific insurance types (health, auto, life, etc.), provide relevant information and guidance.
- Help users understand policy terms, coverage limits, deductibles, and exclusions.
- When comparing policies, highlight key differences in coverage, cost, and benefits.
- Always respond in the user's preferred language (Spanish or English).
- Be encouraging and supportive while providing professional insurance guidance.`;

  const result = await streamText({
    model: oai('gpt-4-turbo-preview'),
    system: systemPrompt,
    messages,
  });

  console.log('✅ Chat API response generated successfully');
  return result.toDataStreamResponse();
} 