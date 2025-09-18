import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Approximate tokens helper (1 token ≈ 4 chars)
function approxTokens(text: string): number {
  return Math.ceil((text?.length || 0) / 4);
}

// Sanitize to avoid control/zero-width chars
function sanitize(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === 'string' ? body.text : '';
    const locale: 'en' | 'es' = body?.locale === 'en' ? 'en' : 'es';

    const cleaned = sanitize(text);
    if (!cleaned || cleaned.length < 10) {
      return NextResponse.json({ error: 'schema_mismatch' }, { status: 400 });
    }

    const charLimit = (() => {
      const raw = String((await import('@/lib/env')).getPublicEnv().NEXT_PUBLIC_LONG_PASTE_CHAR_LIMIT || '').trim();
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : 12000;
    })();

    // If not actually long, just return original text as compactText
    if (cleaned.length <= charLimit) {
      return NextResponse.json({ compactText: cleaned, originalChars: cleaned.length, compactChars: cleaned.length, approxTokens: approxTokens(cleaned) });
    }

    // If no API key, fallback to truncation
    if (!process.env.OPENAI_API_KEY) {
      const truncated = cleaned.slice(0, charLimit);
      return NextResponse.json({ compactText: truncated, originalChars: cleaned.length, compactChars: truncated.length, approxTokens: approxTokens(truncated), fallback: 'truncated' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const targetChars = Math.min(8000, Math.max(5000, Math.floor(charLimit * 0.65)));
    const systemPrompt = locale === 'en'
      ? `You condense long user-provided insurance-related text into a concise note preserving:
- Any explicit insurance category mentions
- Budget amounts (keep numeric values as-is, include currency if present)
- Must-have coverages or requirements
- Client persona details relevant to insurance
- Important constraints (city, dates, dependents)

CRITICAL: Keep key phrases and numbers intact. Do not invent information. Remove greetings, pleasantries, and irrelevant details. Output plain text in English. Length strictly under ${targetChars} characters.`
      : `Condensa texto largo relacionado con seguros en una nota concisa preservando:
- Categorías de seguro explícitas
- Montos de presupuesto (mantén valores numéricos tal como están, incluye moneda si aparece)
- Coberturas imprescindibles o requisitos
- Detalles de la persona/cliente relevantes
- Restricciones importantes (ciudad, fechas, dependientes)

CRÍTICO: Mantén frases y números clave intactos. No inventes información. Quita saludos y detalles irrelevantes. Respuesta en español. Longitud estrictamente menor a ${targetChars} caracteres.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: cleaned }
      ],
      max_tokens: 2000,
    });

    const compactText = (completion.choices?.[0]?.message?.content || '').trim();
    if (!compactText || compactText.length < 10) {
      return NextResponse.json({ error: 'summarization_failed' }, { status: 500 });
    }

    return NextResponse.json({
      compactText,
      originalChars: cleaned.length,
      compactChars: compactText.length,
      approxTokens: approxTokens(compactText)
    });
  } catch (error: any) {
    console.error('[summarize-and-parse] error:', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}


