import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { POLICY_BUCKET } from '@/lib/buckets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const uploadId = url.searchParams.get('uploadId');
  if (!uploadId) return NextResponse.json({ error: 'missing uploadId' }, { status: 400 });

  const supa = createServerSupabaseClient();
  
  // Optional dev switch to return mocked analysis
  if (process.env.USE_MOCK_ANALYSIS === '1') {
    // Try to get viewerUrl from the actual upload record even in mock mode
    let viewerUrl: string | null = null;
    try {
      const { data: uploadData } = await supa
        .from('policy_uploads')
        .select('storage_path')
        .eq('id', uploadId)
        .single();
      
      if (uploadData?.storage_path) {
        const { data: signedUrlData } = await supa.storage
          .from(POLICY_BUCKET)
          .createSignedUrl(uploadData.storage_path, 60 * 60 * 24 * 7); // 7 days
        viewerUrl = signedUrlData?.signedUrl || null;
      }
    } catch (e) {
      console.warn('[result] Could not create viewerUrl for mock:', e);
    }
    
    const mock = {
      policyType: 'Salud',
      premium: { amount: 120000, currency: 'COP', frequency: 'monthly' },
      policyDetails: { insured: ['Titular'] },
      insurer: { name: 'Aseguradora Demo', contact: 'soporte@demo.co', emergencyLines: ['123'] },
      coverage: { limits: { 'Gastos médicos': 50000000 }, deductibles: { 'Consulta': 30000 }, exclusions: ['Preexistencias en 6 meses'], geography: 'Colombia', claimInstructions: ['Llama a la línea 123'] },
      keyFeatures: ['Cobertura nacional 24/7', 'Red amplia de clínicas'],
      recommendations: ['Aumentar cobertura de accidentes'],
      riskScore: 4,
      redFlags: [],
      missingInfo: [],
      _pdfData: { pdfUrl: 'https://example.com/demo.pdf' }
    };
    return NextResponse.json({ 
      status: 'completed', 
      analysis: mock,
      viewerUrl 
    }, { status: 200 });
  }

  const { data, error } = await supa
    .from('policy_uploads')
    .select('ai_summary, pdf_url, storage_path, status, error_code')
    .eq('id', uploadId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let analysis: any = null;
  try { analysis = data?.ai_summary ? JSON.parse(data.ai_summary) : null; } catch {}
  if (analysis && data?.pdf_url) {
    analysis._pdfData = { ...(analysis._pdfData||{}), pdfUrl: data.pdf_url };
  }
  
  // Create signed URL for viewerUrl
  let viewerUrl: string | null = null;
  if (data?.storage_path) {
    try {
      const { data: signedUrlData } = await supa.storage
        .from(POLICY_BUCKET)
        .createSignedUrl(data.storage_path, 60 * 60 * 24 * 7); // 7 days
      viewerUrl = signedUrlData?.signedUrl || null;
    } catch (e) {
      console.warn('[result] Could not create viewerUrl:', e);
    }
  }
  
  return NextResponse.json({ 
    status: data?.status, 
    analysis, 
    reason: data?.error_code || null,
    viewerUrl 
  }, { status: 200 });
}
