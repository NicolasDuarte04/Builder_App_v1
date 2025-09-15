import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getInsurancePlans } from '@/lib/tools/getInsurancePlans';
import { Brief } from '@/types/brief';
import { toStoredCategory } from '@/lib/category-alias';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  category: z.string().min(1),
  country: z.string().optional(),
  maxPrice: z.number().optional(),
  mustHaves: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    console.error('[copilot/search] Invalid JSON:', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[copilot/search] Validation failed:', parsed.error.flatten());
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 422 }
    );
  }

  const { category, country, maxPrice, mustHaves, sessionId } = parsed.data;

  try {
    if (process.env.NODE_ENV === 'development') {
      console.info('[copilot/search] origin →', req.nextUrl.origin);
    }

    // Build minimal brief object from payload (guest mode)
    const brief: Brief | null = sessionId ? {
      id: `copilot-${sessionId}`,
      userId: 'anonymous',
      sessionId,
      locale: 'es',
      source: 'manual',
      category: category === 'auto' ? 'Vehículos' : 
                category === 'salud' ? 'Salud' :
                category === 'vida' ? 'Vida' :
                category === 'viaje' ? 'Viajes' :
                category === 'hogar' ? 'Hogar' : 'Otro',
      maxBudgetCop: maxPrice || null,
      mustHaveCoverages: mustHaves || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      isApplied: true
    } : null;

    // Use centralized plan fetching logic
    const result = await getInsurancePlans({
      brief,
      base: req.nextUrl.origin,
      override: {
        category: toStoredCategory(category) || category,
        max_price: typeof maxPrice === 'number' ? maxPrice : undefined,
        benefits_contain: Array.isArray(mustHaves) ? mustHaves.join(',') : undefined,
        limit: 3,
      }
    });

    // Return normalized response
    if (result.type === 'plans') {
      return NextResponse.json({ plans: result.plans, auth: false });
    } else {
      // Return templates alongside empty plans array
      return NextResponse.json({ 
        plans: [], 
        templates: result.templates,
        auth: false 
      });
    }
  } catch (error) {
    console.error('[copilot/search] Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


