import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-analyzer';
import { assignOcrFallback } from '@/lib/flags';
import { telemetry, getSafeFileMetadata, normalizeError } from '@/lib/telemetry';
// Lazy import to avoid optional dependency at build time
let enhanced: any = null;
async function ensureEnhanced() {
  if (!enhanced) {
    try { enhanced = await import('@/lib/pdf-analyzer-enhanced'); } catch { enhanced = null; }
  }
  return enhanced;
}
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { updatePolicyUploadWithClient } from '@/lib/supabase-policy';
import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { parseCopMoney } from '@/lib/money';
import { signUploadId } from '@/lib/status-signature';
import { POLICY_BUCKET } from '@/lib/buckets';

// Force Node.js runtime for NextAuth/Supabase compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// GET health check endpoint
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    return NextResponse.json({
      ok: true,
      runtime: process.env.NEXT_RUNTIME ?? 'unknown',
      hasSession: !!session,
      userId: (session?.user as any)?.id ?? null,
      now: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, where: 'analyze-policy::GET', message: String(e) },
      { status: 500 }
    );
  }
}

  // Define the schema for the policy analysis - enhanced with user-relevant fields
const PolicyAnalysisSchema = z.object({
  policyType: z.string().default("Unknown"),
  premium: z.object({
    amount: z.number().default(0),
    currency: z.string().default("COP"),
    frequency: z.string().default("monthly"),
    period: z.string().default('unknown'),
    source: z.string().default('unknown'),
    validated: z.boolean().default(false)
  }).default({ amount: 0, currency: "COP", frequency: "monthly", period: 'unknown', source: 'unknown', validated: false }),
  policyDetails: z.object({
    policyNumber: z.string().optional(),
    effectiveDate: z.string().optional(),
    expirationDate: z.string().optional(),
    insured: z.array(z.string()).default([])
  }).default({ insured: [] }),
  // New user-relevant fields
  insurer: z.object({
    name: z.string().default(""),
    contact: z.string().default(""),
    emergencyLines: z.array(z.string()).default([])
  }).default({ name: "", contact: "", emergencyLines: [] }),
  policyManagement: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    policyLink: z.string().optional(),
    renewalReminders: z.boolean().default(false)
  }).default({ renewalReminders: false }),
  legal: z.object({
    obligations: z.array(z.string()).default([]),
    complianceNotes: z.array(z.string()).default([])
  }).default({ obligations: [], complianceNotes: [] }),
  coverage: z.object({
    limits: z.record(z.number()).default({}),
    deductibles: z.record(z.number()).default({}),
    exclusions: z.array(z.string()).default([]),
    geography: z.string().default("Colombia"),
    claimInstructions: z.array(z.string()).default([])
  }).default({ limits: {}, deductibles: {}, exclusions: [], geography: "Colombia", claimInstructions: [] }),
  keyFeatures: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  riskScore: z.number().min(1).max(10).default(5),
  // New: require an explicit justification string for transparency
  riskJustification: z.string().default(''),
  // Optional premium table parsed from document tables
  premiumTable: z.array(z.object({
    label: z.string().optional(),
    year: z.union([z.string(), z.number()]).optional(),
    plan: z.string().optional(),
    amount: z.union([z.number(), z.string()]).optional(),
  })).default([]),
  // Enhanced fields for traceability and transparency
  sourceQuotes: z.record(z.string()).default({}),
  redFlags: z.array(z.string()).default([]),
  missingInfo: z.array(z.string()).default([])
});

export async function POST(request: NextRequest) {
  let uploadId: string | null = null;
  let serverSupabase: any = null;
  let storagePath: string | null = null;
  let pdfPublicUrl: string | null = null;
  let extractionMethod: 'text' | 'ocr' = 'text';
  
  try {
    console.log('📋 Starting PDF analysis request...');
    
    // Initialize server Supabase client
    try {
      serverSupabase = createServerSupabaseClient();
      if (process.env.NODE_ENV !== 'production') {
        try {
          const { data: buckets } = await serverSupabase.storage.listBuckets();
          console.log('[analyze-policy] Available buckets:', buckets?.map((b: any) => b.name));
        } catch (e: any) {
          console.log('[analyze-policy] listBuckets error:', e?.message || String(e));
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to create server Supabase client:', error?.message || error);
      return NextResponse.json(
        { error: 'server_db_not_configured', message: String(error?.message || error) },
        { status: 500 }
      );
    }
    
    // Optional session: allow guest analysis
    const session = await getServerSession(authOptions);
    console.log('🔐 Session check:', session ? 'Authenticated' : 'Not authenticated');
    const userId: string | null = (session?.user as any)?.id ?? null;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    console.log('🔐 Using user ID:', userId, isDevelopment ? '(development mode)' : '(production mode)');
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return NextResponse.json(
        { error: 'AI service not configured. Please check server configuration.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const forceOcr = (formData.get('forceOcr') as string) === 'true';
    
    // Check OCR fallback feature flag
    const sessionId = (session?.user as any)?.id || 'anonymous';
    const ocrFallbackVariant = assignOcrFallback(sessionId);
    const isOcrEnabled = ocrFallbackVariant === 'treatment' || forceOcr;
    
    // Track feature flag exposure
    if (!forceOcr) {
      telemetry.track(telemetry.events.FF_ASSIGNMENT, {
        flag: 'ff_ocr_fallback',
        variant: ocrFallbackVariant,
        userId,
        sessionId
      });
    }

    console.log('📋 Request details:', {
      hasFile: !!file,
      fileMetadata: file ? getSafeFileMetadata(file) : null,
      userId: userId,
      userIdType: typeof userId,
      userIdLength: userId?.length,
      isDevelopment: isDevelopment
    });

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Server-side file size guard (10MB)
    const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
    if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
      console.warn('[analyze-policy] file too large', { size: file.size, limit: MAX_UPLOAD_BYTES });
      return NextResponse.json({ code: 'file_too_large', limitMB: 10 }, { status: 413 });
    }

    // Telemetry timing start
    const telemetryStartTs = Date.now();

    console.log('📄 Analyzing PDF policy for user:', userId);

    // Create initial upload record
    console.log('💾 Creating upload record in database...');
    // Insert initial upload row directly (status: uploading)
    const { data: uploadRecord, error: createErr } = await serverSupabase
      .from('policy_uploads')
      .insert({
        user_id: userId,
        file_name: file.name,
        storage_path: null,
        pdf_url: null,
        extraction_method: null,
        status: 'uploading'
      })
      .select()
      .single();
    if (createErr) {
      console.error('❌ Failed to create upload record in database', createErr);
      return NextResponse.json(
        { error: 'Failed to create upload record. Please check database configuration.' },
        { status: 500 }
      );
    }

    if (!uploadRecord) {
      console.error('❌ Failed to create upload record in database');
      console.error('Check if policy_uploads table exists and has correct structure');
      return NextResponse.json(
        { error: 'Failed to create upload record. Please check database configuration.' },
        { status: 500 }
      );
    }

    console.log('✅ Upload record created:', uploadRecord.id);
    uploadId = uploadRecord.id;

    // Telemetry: BRIEF_PARSE_STARTED
    try {
      telemetry.track(telemetry.events.BRIEF_PARSE_STARTED, {
        source: 'upload',
        kind: 'pdf',
        bytes: typeof file.size === 'number' ? file.size : null,
        fileMeta: getSafeFileMetadata(file),
        uploadId,
        userId
      });
    } catch {}

    // Upload original PDF to Supabase Storage immediately (for traceability)
    // Keep this before early return so background job can reopen the file via storage
    try {
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = `${userId || 'guest'}/${Date.now()}_${(file.name || 'policy').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { data: uploadData, error: storageError } = await serverSupabase.storage
        .from(POLICY_BUCKET)
        .upload(safeName, buffer, { contentType: 'application/pdf', upsert: false });
      if (storageError) {
        console.error('[analyze-policy] Storage upload failed', {
          bucket: POLICY_BUCKET,
          isServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          error: storageError
        });
        await updatePolicyUploadWithClient(serverSupabase, uploadRecord.id, {
          status: 'error',
          error_message: storageError?.message || 'upload_failed'
        } as any);
        return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 });
      }
      storagePath = uploadData.path;
      try {
        const { data: signed } = await serverSupabase.storage
          .from(POLICY_BUCKET)
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
        pdfPublicUrl = signed?.signedUrl || null;
      } catch (sigErr) {
        console.warn('⚠️ Could not create signed URL, falling back to public URL (if bucket is public)', sigErr);
        const { data: urlData } = serverSupabase.storage
          .from(POLICY_BUCKET)
          .getPublicUrl(storagePath);
        pdfPublicUrl = urlData.publicUrl;
      }
      // Best-effort: update policy_uploads with pdf_url if column exists
      try {
        await serverSupabase
          .from('policy_uploads')
          .update({ pdf_url: pdfPublicUrl, storage_path: storagePath, user_id: userId })
          .eq('id', uploadRecord.id);
      } catch (e) {
        console.warn('⚠️ Could not set pdf_url/storage_path (missing columns?):', e);
      }

      // Fire-and-forget background job for extraction/analysis/summarization
      const bgUserId = userId;
      const bgForceOcr = forceOcr;
      const bgStoragePath = storagePath;
      const bgPdfUrl = pdfPublicUrl;
      const bgOcrEnabled = isOcrEnabled;
      setImmediate(async () => {
        const DEBUG_ANALYZE_STATUS = process.env.DEBUG_ANALYZE_STATUS === '1';
        const setStatus = async (patch: any, label: string) => {
          const id = uploadRecord.id;
          if (DEBUG_ANALYZE_STATUS) console.log('[status→TRY]', label, { id, patch });
          const { data, error } = await serverSupabase
            .from('policy_uploads')
            .update(patch)
            .eq('id', id)
            .select('id,status,updated_at')
            .maybeSingle();

          if (!error) {
            if (DEBUG_ANALYZE_STATUS) console.log('[status→OK]', label, data);
            return;
          }

          console.error('[status→FAIL]', label, error);

          // CHECK constraint → retry with 'processing'
          if (error.code === '23514' && patch.status && patch.status !== 'processing') {
            const fallbackPatch = { ...patch, status: 'processing' };
            const { data: fdata, error: ferr } = await serverSupabase
              .from('policy_uploads')
              .update(fallbackPatch)
              .eq('id', id)
              .select('id,status,updated_at')
              .maybeSingle();
            if (ferr) console.error('[status→FAIL] fallback processing', ferr);
            else if (DEBUG_ANALYZE_STATUS) console.log('[status→OK] fallback processing', fdata);
            return;
          }

          // Unknown column → retry with safe subset
          if (error.code === '42703') {
            const safe: any = { status: patch.status };
            if ('ai_summary' in patch) safe.ai_summary = patch.ai_summary;
            const { data: sdata, error: serr } = await serverSupabase
              .from('policy_uploads')
              .update(safe)
              .eq('id', id)
              .select('id,status,updated_at')
              .maybeSingle();
            if (serr) console.error('[status→FAIL] safe fallback', serr);
            else if (DEBUG_ANALYZE_STATUS) console.log('[status→OK] safe fallback', sdata);
          }
        };
        try {

          // Mock path for smoke test
          if (process.env.USE_MOCK_ANALYSIS === '1') {
            await setStatus({ status: 'extracting' }, 'extracting');
            await setStatus({ status: 'analyzing' }, 'analyzing');
            await setStatus({ status: 'summarizing' }, 'summarizing');
            const mockAnalysis = {
              policyType: 'Salud',
              premium: { amount: 120000, currency: 'COP', frequency: 'monthly' },
              policyDetails: { insured: ['Titular'] },
              insurer: { name: 'Aseguradora Demo', contact: 'soporte@demo.co', emergencyLines: ['123'] },
              coverage: { limits: { 'Gastos médicos': 50000000 }, deductibles: { 'Consulta': 30000 }, exclusions: ['Preexistencias en 6 meses'], geography: 'Colombia', claimInstructions: ['Llama a la línea 123'] },
              keyFeatures: ['Cobertura nacional 24/7', 'Red amplia de clínicas'],
              recommendations: ['Aumentar cobertura de accidentes'],
              riskScore: 4,
              redFlags: [],
              missingInfo: []
            };
            await setStatus({ status: 'completed', ai_summary: JSON.stringify(mockAnalysis) }, 'completed');
            // Telemetry: BRIEF_PARSE_COMPLETED (mock path)
            try {
              const latencyMs = Date.now() - telemetryStartTs;
              const counts = {
                limitsCount: Object.keys((mockAnalysis as any)?.coverage?.limits || {}).length,
                deductiblesCount: Object.keys((mockAnalysis as any)?.coverage?.deductibles || {}).length,
                exclusionsCount: ((mockAnalysis as any)?.coverage?.exclusions || []).length,
                claimInstructionsCount: ((mockAnalysis as any)?.coverage?.claimInstructions || []).length,
                emergencyLinesCount: ((mockAnalysis as any)?.insurer?.emergencyLines || []).length,
                insuredCount: ((mockAnalysis as any)?.policyDetails?.insured || []).length,
                keyFeaturesCount: ((mockAnalysis as any)?.keyFeatures || []).length,
                recommendationsCount: ((mockAnalysis as any)?.recommendations || []).length,
                redFlagsCount: ((mockAnalysis as any)?.redFlags || []).length,
                missingInfoCount: ((mockAnalysis as any)?.missingInfo || []).length,
                premiumTableRows: ((mockAnalysis as any)?.premiumTable || []).length,
                sourceQuotesCount: Object.keys((mockAnalysis as any)?.sourceQuotes || {}).length,
              };
              const extractedFields: string[] = [];
              if ((mockAnalysis as any)?.policyType) extractedFields.push('policyType');
              if ((mockAnalysis as any)?.premium?.amount > 0) extractedFields.push('premium');
              if ((mockAnalysis as any)?.policyDetails?.policyNumber) extractedFields.push('policyDetails.policyNumber');
              if ((mockAnalysis as any)?.policyDetails?.effectiveDate) extractedFields.push('policyDetails.effectiveDate');
              if ((mockAnalysis as any)?.policyDetails?.expirationDate) extractedFields.push('policyDetails.expirationDate');
              if (((mockAnalysis as any)?.policyDetails?.insured || []).length > 0) extractedFields.push('policyDetails.insured');
              if ((mockAnalysis as any)?.insurer?.name) extractedFields.push('insurer.name');
              if ((mockAnalysis as any)?.insurer?.contact) extractedFields.push('insurer.contact');
              if (((mockAnalysis as any)?.insurer?.emergencyLines || []).length > 0) extractedFields.push('insurer.emergencyLines');
              if (Object.keys((mockAnalysis as any)?.coverage?.limits || {}).length > 0) extractedFields.push('coverage.limits');
              if (Object.keys((mockAnalysis as any)?.coverage?.deductibles || {}).length > 0) extractedFields.push('coverage.deductibles');
              if (((mockAnalysis as any)?.coverage?.exclusions || []).length > 0) extractedFields.push('coverage.exclusions');
              if (((mockAnalysis as any)?.coverage?.claimInstructions || []).length > 0) extractedFields.push('coverage.claimInstructions');
              if (((mockAnalysis as any)?.keyFeatures || []).length > 0) extractedFields.push('keyFeatures');
              if (((mockAnalysis as any)?.recommendations || []).length > 0) extractedFields.push('recommendations');
              if ((mockAnalysis as any)?.riskScore) extractedFields.push('riskScore');
              if ((mockAnalysis as any)?.riskJustification) extractedFields.push('riskJustification');
              if (((mockAnalysis as any)?.premiumTable || []).length > 0) extractedFields.push('premiumTable');
              telemetry.track(telemetry.events.BRIEF_PARSE_COMPLETED, {
                source: 'upload',
                uploadId: uploadRecord.id,
                userId: bgUserId,
                latencyMs,
                extractionMethod,
                extractedFields,
                counts,
              });
            } catch {}
            return;
          }

          // Move to extracting
          await setStatus({ status: 'extracting' }, 'extracting');

          // Extract text
          console.log('📄 [bg] Extracting text from PDF...');
          let pdfText: string;
          let ocrWasUsed = false;
          
          try {
            const enh = await ensureEnhanced();
            
            // First try standard text extraction unless OCR is forced
            if (!bgForceOcr) {
              try {
                const text = await extractTextFromPDF(file);
                // Check if we got meaningful text (more than 100 chars)
                if (text && text.trim().length > 100) {
                  pdfText = text;
                  extractionMethod = 'text';
                } else if (bgOcrEnabled && enh?.extractTextFromPDFOCROnly) {
                  // Low confidence in text extraction, try OCR if enabled
                  console.log('⚠️ [bg] Low text confidence, attempting OCR fallback...');
                  telemetry.track(telemetry.events.PDF_OCR_STARTED, {
                    uploadId: uploadRecord.id,
                    userId: bgUserId,
                    reason: 'low_text_confidence',
                    textLength: text?.length || 0
                  });
                  
                  ocrWasUsed = true;
                  const ocrResult = await enh.extractTextFromPDFOCROnly(file);
                  pdfText = ocrResult.text;
                  extractionMethod = ocrResult.method;
                  
                  telemetry.track(telemetry.events.PDF_OCR_COMPLETED, {
                    uploadId: uploadRecord.id,
                    userId: bgUserId,
                    textLength: pdfText.length,
                    pageCount: ocrResult.pageCount
                  });
                } else {
                  // OCR not enabled or not available, use what we have
                  pdfText = text || '';
                  extractionMethod = 'text';
                }
              } catch (textError) {
                if (isOcrEnabled && enh?.extractTextFromPDFOCROnly) {
                  console.log('⚠️ [bg] Text extraction failed, attempting OCR fallback...');
                  telemetry.track(telemetry.events.PDF_OCR_STARTED, {
                    uploadId: uploadRecord.id,
                    userId: bgUserId,
                    reason: 'text_extraction_failed'
                  });
                  
                  ocrWasUsed = true;
                  const ocrResult = await enh.extractTextFromPDFOCROnly(file);
                  pdfText = ocrResult.text;
                  extractionMethod = ocrResult.method;
                  
                  telemetry.track(telemetry.events.PDF_OCR_COMPLETED, {
                    uploadId: uploadRecord.id,
                    userId: bgUserId,
                    textLength: pdfText.length,
                    pageCount: ocrResult.pageCount
                  });
                } else {
                  throw textError;
                }
              }
            } else {
              // OCR forced by user
              if (enh?.extractTextFromPDFOCROnly) {
                telemetry.track(telemetry.events.PDF_OCR_STARTED, {
                  uploadId: uploadRecord.id,
                  userId: bgUserId,
                  reason: 'user_forced'
                });
                
                ocrWasUsed = true;
                const ocrResult = await enh.extractTextFromPDFOCROnly(file);
                pdfText = ocrResult.text;
                extractionMethod = ocrResult.method;
                
                telemetry.track(telemetry.events.PDF_OCR_COMPLETED, {
                  uploadId: uploadRecord.id,
                  userId: bgUserId,
                  textLength: pdfText.length,
                  pageCount: ocrResult.pageCount
                });
              } else {
                throw new Error('OCR requested but not available');
              }
            }
          } catch (e) {
            console.error('❌ [bg] PDF extraction failed:', e);
            
            // Track OCR failure if it was attempted
            if (ocrWasUsed) {
              const error = normalizeError(e, 'ocr_extraction');
              telemetry.track(telemetry.events.PDF_OCR_FAILED, {
                uploadId: uploadRecord.id,
                userId: bgUserId,
                ...error
              });
            }
            
            // Return a specific error for OCR failures
            const isOcrError = ocrWasUsed || (e instanceof Error && e.message.includes('OCR'));
            const error = normalizeError(e, 'pdf_extraction');
            await setStatus({
              status: 'error',
              error_code: isOcrError ? 'OCR_FAILED' : 'EXTRACTION_FAILED',
              error_message: isOcrError 
                ? 'No se pudo extraer texto del PDF. Por favor, sube un PDF con texto seleccionable en lugar de una imagen escaneada.'
                : 'Error al extraer texto del PDF'
            }, 'error');
            
            telemetry.track(telemetry.events.BRIEF_PARSE_FAILED, {
              source: 'upload',
              uploadId: uploadRecord.id,
              userId: bgUserId,
              ...error
            });
            
            return;
          }

          await setStatus({
            extracted_text: `<len=${pdfText.length}>`,
            status: 'analyzing',
            extraction_method: extractionMethod,
          }, 'analyzing');

          // AI analysis
          console.log('🤖 [bg] Starting AI analysis...');
          const oai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
          const analysis = await analyzePolicyWithAIMultiChunk(pdfText, oai).catch(async (err: any) => {
            // Quota handling
            const code = (err?.status || err?.code || '').toString();
            const isQuota = code === '429' || /insufficient_quota|quota/i.test(String(err?.message || err));
            if (isQuota) {
              console.warn('⚠️ Quota exceeded during analysis, marking upload as error/quota');
              await setStatus({
                status: 'error',
                error_code: 'quota',
                error_message: 'OpenAI quota exceeded'
              }, 'error');
              // Telemetry: BRIEF_PARSE_FAILED (quota)
              try {
                const latencyMs = Date.now() - telemetryStartTs;
                const error = normalizeError({ message: 'quota exceeded' }, 'ai_analysis');
                telemetry.track(telemetry.events.BRIEF_PARSE_FAILED, { source: 'upload', uploadId: uploadRecord.id, userId: bgUserId, ...error, latencyMs });
              } catch {}
              return null;
            }
            throw err;
          });

          if (!analysis) {
            // early exit on quota error already written
            return;
          }

          await setStatus({ status: 'summarizing' }, 'summarizing');

          const finalAnalysis = postProcessAnalysis(pdfText, analysis, {
            extractionMethod,
            pdfPublicUrl: bgPdfUrl || null,
          });

          const isSpanish = /[áéíóúñü]/i.test(pdfText) || /\b(el|la|los|las|de|del|con|por|para|en|es|son|está|están|tiene|tienen|puede|pueden|debe|deben|ser|estar|hacer|tener|ir|venir|dar|ver|saber|querer|poder|deber|hay|está|están|muy|más|menos|bien|mal|bueno|buena|malo|mala|grande|pequeño|nuevo|viejo|alto|bajo|largo|corto|ancho|estrecho|fuerte|débil|rico|pobre|feliz|triste|contento|enojado|cansado|despierto|limpio|sucio|caliente|frío|caluroso|fresco|seco|mojado|lleno|vacío|abierto|cerrado|nuevo|usado|caro|barato|fácil|difícil|importante|necesario|posible|imposible|correcto|incorrecto|verdadero|falso|cierto|seguro|claro|oscuro|brillante|opaco|transparente|visible|invisible|público|privado|nacional|internacional|local|global|especial|general|particular|común|raro|normal|extraño|usual|habitual|frecuente|ocasional|siempre|nunca|a veces|a menudo|raramente|casi|apenas|exactamente|aproximadamente|cerca|lejos|dentro|fuera|arriba|abajo|adelante|atrás|izquierda|derecha|centro|medio|mitad|parte|todo|nada|algo|nadie|alguien|cualquiera|cada|cual|cuál|qué|quién|dónde|cuándo|cómo|por qué|cuánto|cuánta|cuántos|cuántas)\b/i.test(pdfText);

          await setStatus({
            status: 'completed',
            ai_summary: JSON.stringify(finalAnalysis)
          }, 'completed');
          // Telemetry: BRIEF_PARSE_COMPLETED
          try {
            const latencyMs = Date.now() - telemetryStartTs;
            const counts = {
              limitsCount: Object.keys(finalAnalysis?.coverage?.limits || {}).length,
              deductiblesCount: Object.keys(finalAnalysis?.coverage?.deductibles || {}).length,
              exclusionsCount: (finalAnalysis?.coverage?.exclusions || []).length,
              claimInstructionsCount: (finalAnalysis?.coverage?.claimInstructions || []).length,
              emergencyLinesCount: (finalAnalysis?.insurer?.emergencyLines || []).length,
              insuredCount: (finalAnalysis?.policyDetails?.insured || []).length,
              keyFeaturesCount: (finalAnalysis?.keyFeatures || []).length,
              recommendationsCount: (finalAnalysis?.recommendations || []).length,
              redFlagsCount: (finalAnalysis?.redFlags || []).length,
              missingInfoCount: (finalAnalysis?.missingInfo || []).length,
              premiumTableRows: (finalAnalysis?.premiumTable || []).length,
              sourceQuotesCount: Object.keys(finalAnalysis?.sourceQuotes || {}).length,
            };
            const extractedFields: string[] = [];
            if (finalAnalysis?.policyType) extractedFields.push('policyType');
            if (finalAnalysis?.premium?.amount > 0) extractedFields.push('premium');
            if (finalAnalysis?.policyDetails?.policyNumber) extractedFields.push('policyDetails.policyNumber');
            if (finalAnalysis?.policyDetails?.effectiveDate) extractedFields.push('policyDetails.effectiveDate');
            if (finalAnalysis?.policyDetails?.expirationDate) extractedFields.push('policyDetails.expirationDate');
            if ((finalAnalysis?.policyDetails?.insured || []).length > 0) extractedFields.push('policyDetails.insured');
            if (finalAnalysis?.insurer?.name) extractedFields.push('insurer.name');
            if (finalAnalysis?.insurer?.contact) extractedFields.push('insurer.contact');
            if ((finalAnalysis?.insurer?.emergencyLines || []).length > 0) extractedFields.push('insurer.emergencyLines');
            if (Object.keys(finalAnalysis?.coverage?.limits || {}).length > 0) extractedFields.push('coverage.limits');
            if (Object.keys(finalAnalysis?.coverage?.deductibles || {}).length > 0) extractedFields.push('coverage.deductibles');
            if ((finalAnalysis?.coverage?.exclusions || []).length > 0) extractedFields.push('coverage.exclusions');
            if ((finalAnalysis?.coverage?.claimInstructions || []).length > 0) extractedFields.push('coverage.claimInstructions');
            if ((finalAnalysis?.keyFeatures || []).length > 0) extractedFields.push('keyFeatures');
            if ((finalAnalysis?.recommendations || []).length > 0) extractedFields.push('recommendations');
            if (finalAnalysis?.riskScore) extractedFields.push('riskScore');
            if (finalAnalysis?.riskJustification) extractedFields.push('riskJustification');
            if ((finalAnalysis?.premiumTable || []).length > 0) extractedFields.push('premiumTable');
            telemetry.track(telemetry.events.BRIEF_PARSE_COMPLETED, {
              source: 'upload',
              uploadId: uploadRecord.id,
              userId: bgUserId,
              latencyMs,
              extractionMethod,
              extractedFields,
              counts,
            });
          } catch {}
        } catch (error: any) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error during analysis';
          console.error('❌ [bg] Error during analysis:', errorMessage);
          const telemetryError = normalizeError(error, 'background_job');
          await setStatus({
            status: 'error',
            error_code: 'internal',
            error_message: errorMessage,
          }, 'error');
          console.error('[bg job ERROR]', error);
          // Telemetry: BRIEF_PARSE_FAILED
          try {
            const latencyMs = Date.now() - telemetryStartTs;
            telemetry.track(telemetry.events.BRIEF_PARSE_FAILED, { source: 'upload', uploadId: uploadRecord.id, userId: bgUserId, ...telemetryError, latencyMs });
          } catch {}
        }
      });

      // Early return 202 with id + signature so client can start polling
      const statusSig = signUploadId(uploadRecord.id);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[analyze] early-202 uploadId=${uploadRecord.id}, uploaderUserId=${userId}`);
      }
      return NextResponse.json({ uploadId: uploadRecord.id, statusSig, status: 'queued' }, { status: 202 });
    } catch (e) {
      console.warn('⚠️ Exception during early storage/upload phase:', e);
      await updatePolicyUploadWithClient(serverSupabase, uploadRecord.id, {
        status: 'error',
        error_message: (e as any)?.message || 'upload_phase_failed'
      } as any);
      try {
        const error = normalizeError(e, 'upload_phase');
        telemetry.track(telemetry.events.BRIEF_PARSE_FAILED, { source: 'upload', uploadId: uploadRecord.id, userId, ...error });
      } catch {}
      return NextResponse.json({ error: 'upload_phase_failed' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[analyze-policy] error:', error);
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const telemetryError = normalizeError(error, 'request_handler');
    try {
      telemetry.track(telemetry.events.BRIEF_PARSE_FAILED, { source: 'upload', uploadId, ...telemetryError });
    } catch {}
    return NextResponse.json(
      { 
        error: 'internal', 
        where: 'analyze-policy',
        message: errorMessage,
        uploadId: uploadId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Split long documents by headings and chunk length, analyze per chunk, and merge results
async function analyzePolicyWithAIMultiChunk(pdfText: string, oai: any) {
  const MODEL = process.env.ANALYZE_MODEL ?? 'gpt-4o-mini';
  try {
    // Detect language from the PDF text
    const isSpanish = /[áéíóúñü]/i.test(pdfText) || 
                     /\b(el|la|los|las|de|del|con|por|para|en|es|son|está|están|tiene|tienen|puede|pueden|debe|deben|ser|estar|hacer|tener|ir|venir|dar|ver|saber|querer|poder|deber|hay|está|están|muy|más|menos|bien|mal|bueno|buena|malo|mala|grande|pequeño|nuevo|viejo|alto|bajo|largo|corto|ancho|estrecho|fuerte|débil|rico|pobre|feliz|triste|contento|enojado|cansado|despierto|limpio|sucio|caliente|frío|caluroso|fresco|seco|mojado|lleno|vacío|abierto|cerrado|nuevo|usado|caro|barato|fácil|difícil|importante|necesario|posible|imposible|correcto|incorrecto|verdadero|falso|cierto|seguro|claro|oscuro|brillante|opaco|transparente|visible|invisible|público|privado|nacional|internacional|local|global|especial|general|particular|común|raro|normal|extraño|usual|habitual|frecuente|ocasional|siempre|nunca|a veces|a menudo|raramente|casi|apenas|exactamente|aproximadamente|cerca|lejos|dentro|fuera|arriba|abajo|adelante|atrás|izquierda|derecha|centro|medio|mitad|parte|todo|nada|algo|nadie|alguien|cualquiera|cada|cual|cuál|qué|quién|dónde|cuándo|cómo|por qué|cuánto|cuánta|cuántos|cuántas)\b/i.test(pdfText);
    
    const language = isSpanish ? 'Spanish' : 'English';
    console.log(`🌐 Detected language: ${language}`);

    const systemPrompt = `You are an expert insurance analyst specializing in Latin American insurance policies. Analyze the provided document and extract comprehensive, specific information.

CRITICAL INSTRUCTIONS:
1. RESPOND IN ${language.toUpperCase()} - all user-facing text must be in ${language}
2. Extract exact quotes from the document for traceability
3. Flag any concerning issues or missing coverage as red flags
4. Track fields where information could not be found

EXTRACTION REQUIREMENTS:

1. POLICY BASICS:
   - Policy Type (salud, vida, auto, hogar, empresarial, etc.)
   - Premium (monto, moneda, frecuencia) — if not explicitly present, DO NOT invent; leave 0 and add to missingInfo
   - Insurer details (nombre, contacto, líneas de emergencia). Prefer explicit phone/email/URLs where found
   - Policy dates and numbers

2. COVERAGE ANALYSIS:
   - Limits: Extract specific coverage amounts with their descriptions
   - Deductibles: List all deductibles with exact amounts
   - Exclusions: List ALL exclusions found in the document (comprehensive)
   - Geographic coverage area (geography). Default to Colombia if not specified
   - Claim instructions (step by step if available). Include phone, email, URLs where applicable

3. SOURCE QUOTES (sourceQuotes):
   For each extracted field, save the EXACT text from the document that was used.
   Example: "coverage.limits.medical": "Gastos médicos hasta $50,000,000 COP por evento"
   
4. RED FLAGS (redFlags):
   Identify and list concerning issues such as:
   - Missing essential coverage (e.g., "Sin cobertura de maternidad")
   - Unusually high deductibles
   - Restrictive exclusions (e.g., "Excluye condiciones preexistentes")
   - Short coverage periods
   - Limited geographic coverage
   
5. MISSING INFORMATION (missingInfo):
   List any important fields that could not be found, such as:
   - "Emergency contact numbers not specified"
   - "Deductible amounts not clearly stated"
   - "Claims process not documented"

6. USER-FRIENDLY SUMMARIES:
   - keyFeatures: Simple, clear benefits in ${language} (e.g., "Cobertura nacional 24/7")
   - recommendations: Actionable advice in ${language} (e.g., "Considere aumentar cobertura de responsabilidad civil")
   - legal.obligations: User responsibilities in plain ${language}
   - coverage.claimInstructions: Step-by-step process in simple ${language}

7. RISK SCORE (1-10):
   - 1-3: Excellent coverage, minimal gaps
   - 4-6: Adequate coverage with some gaps
   - 7-10: Significant gaps or concerns
   - Also provide riskJustification with a short, specific rationale referencing coverage/exclusions/deductibles and, when possible, quotes

IMPORTANT: If the document is NOT an insurance policy, adapt the analysis but still extract source quotes and identify any risks or important information.`;

    // Check if the PDF has no extractable text
    if (!pdfText.trim() || pdfText.includes('No text content could be extracted')) {
      console.log('⚠️ PDF has no extractable text content');
      throw new Error('This PDF appears to contain only images or has no extractable text. Please upload a PDF with text content.');
    }

    console.log('🤖 Preparing chunks for analysis...');
    console.log(`📄 Text length: ${pdfText.length} characters`);

    const chunks = splitIntoSemanticChunks(pdfText);
    const MAX_CHUNKS = 5; // bound for latency
    // Prioritize chunks that likely contain pricing tables / premiums first
    const priceKeywords = /(PRIMA|VALOR|PRECIO|TARIFA|COSTO|SEMESTRE|AÑO|ANUAL|MENSUAL|MATRÍCULA|TUITION|PREMIUM|PRICE)/i;
    const sorted = [...chunks].sort((a, b) => {
      const aScore = priceKeywords.test(a.title) || priceKeywords.test(a.text.slice(0, 200)) ? 1 : 0;
      const bScore = priceKeywords.test(b.title) || priceKeywords.test(b.text.slice(0, 200)) ? 1 : 0;
      return bScore - aScore;
    });
    const selectedChunks = sorted.slice(0, MAX_CHUNKS);

    // If short, single-call analysis
    if (selectedChunks.length <= 1 && pdfText.length <= 7000) {
      try {
        const result = await generateObject({
          model: oai(MODEL),
          system: systemPrompt,
          prompt: `Please analyze this document and provide a structured analysis. If premiums/tariffs appear in tables, extract them into premiumTable and infer main premium if applicable. Be specific and avoid hallucinations.\n\n${pdfText.substring(0, 8000)}`,
          schema: PolicyAnalysisSchema,
          temperature: 0.3,
          maxTokens: 2000,
        });
        console.log('✅ Single-chunk AI analysis completed successfully');
        return result.object;
      } catch (schemaError) {
        console.error('⚠️ Single-chunk schema validation failed, trying fallback:', schemaError);
        const fallbackResult = await generateObject({
          model: oai(MODEL),
          system: systemPrompt,
          prompt: `Analyze this document and return structured data faithfully. If premiums/tariffs appear in tables, extract them into premiumTable.\n\n${pdfText.substring(0, 4000)}`,
          schema: PolicyAnalysisSchema,
          temperature: 0.5,
          maxTokens: 1500,
        });
        console.log('✅ Single-chunk fallback AI analysis completed');
        return fallbackResult.object;
      }
    }

    // Multi-chunk: analyze in parallel and merge
    const prompts = selectedChunks.slice(0, 3).map((chunk, idx) => (
      `Section ${idx + 1}/${selectedChunks.length} — ${chunk.title || 'Untitled section'}\n\n` +
      `Analyze ONLY this section faithfully. DO NOT invent details not present in this section. ` +
      `If a field is not present in this section, leave it empty and add a descriptive message to missingInfo indicating it was not found in section ${idx + 1}.\n\n` +
      chunk.text.substring(0, 7500)
    ));

    const calls = prompts.map(async (prompt) => {
      try {
        const r = await generateObject({
          model: oai(MODEL),
          system: systemPrompt,
          prompt,
          schema: PolicyAnalysisSchema,
          temperature: 0.2,
          maxTokens: 1200,
        });
        return r.object;
      } catch (err) {
        console.warn('⚠️ Chunk analysis failed, retrying with same model');
        const r = await generateObject({
          model: oai(MODEL),
          system: systemPrompt,
          prompt,
          schema: PolicyAnalysisSchema,
          temperature: 0.3,
          maxTokens: 1000,
        });
        return r.object;
      }
    });

    const results = await Promise.all(calls);
    console.log(`✅ Multi-chunk analysis completed for ${results.length} chunks`);
    const merged = mergeAnalyses(results);
    return merged;
    
  } catch (error) {
    console.error('❌ Error in AI analysis:', error);
    
    // Return a default analysis if all else fails
    console.log('⚠️ Returning default analysis due to errors');
    return {
      policyType: "Document Analysis Failed",
      premium: {
        amount: 0,
        currency: "COP",
        frequency: "N/A"
      },
      policyDetails: {
        policyNumber: "N/A",
        effectiveDate: new Date().toISOString().split('T')[0],
        expirationDate: "N/A",
        insured: []
      },
      insurer: {
        name: "",
        contact: "",
        emergencyLines: []
      },
      policyManagement: {
        startDate: undefined,
        endDate: undefined,
        policyLink: undefined,
        renewalReminders: false
      },
      legal: {
        obligations: [],
        complianceNotes: []
      },
      coverage: {
        limits: {},
        deductibles: {},
        exclusions: ["Unable to analyze document"],
        geography: "Colombia",
        claimInstructions: []
      },
      keyFeatures: ["Document analysis encountered an error"],
      recommendations: ["Please ensure the PDF contains readable text", "Try uploading a different document"],
      riskScore: 5,
      riskJustification: 'Defaulted due to analysis error',
      sourceQuotes: {},
      redFlags: ["Unable to analyze document - possible scanned PDF or image-based content"],
      missingInfo: ["All fields - document could not be analyzed"]
    };
  }
} 

function splitIntoSemanticChunks(text: string): { title: string; text: string }[] {
  const headings = [
    'COBERTURA', 'COBERTURAS', 'EXCLUSIONES', 'DED\u00daCIBLES', 'DEDUCIBLES', 'CONDICIONES GENERALES',
    'CLAIMS', 'RECLAMOS', 'RECLAMACIONES', 'ASISTENCIA', 'URGENCIAS', 'BENEFICIOS', 'SUMAS ASEGURADAS',
    'POLICY', 'COVERAGE', 'EXCLUSIONS', 'DEDUCIBLE', 'GENERAL CONDITIONS'
  ];
  const pattern = new RegExp(`(^|\n)\s*(?:${headings.join('|')})\b.*`, 'gi');
  const indices: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    indices.push(match.index);
  }
  // If no headings found, split by length
  if (indices.length === 0) {
    const CHUNK_SIZE = 6500;
    const chunks: { title: string; text: string }[] = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push({ title: `Chunk ${chunks.length + 1}`, text: text.slice(i, i + CHUNK_SIZE) });
    }
    return chunks;
  }
  // Build chunks from heading indices
  const slices: { title: string; text: string }[] = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1] : text.length;
    const slice = text.slice(start, end);
    const firstLine = slice.split('\n', 1)[0] || '';
    const title = firstLine.trim().slice(0, 80);
    slices.push({ title: title || `Section ${i + 1}`, text: slice });
  }
  return slices;
}

function mergeAnalyses(results: any[]): any {
  const base = {
    policyType: '',
    premium: { amount: 0, currency: 'COP', frequency: 'monthly' },
    policyDetails: { policyNumber: undefined, effectiveDate: undefined, expirationDate: undefined, insured: [] as string[] },
    insurer: { name: '', contact: '', emergencyLines: [] as string[] },
    policyManagement: { startDate: undefined, endDate: undefined, policyLink: undefined, renewalReminders: false },
    legal: { obligations: [] as string[], complianceNotes: [] as string[] },
    coverage: { limits: {} as Record<string, number>, deductibles: {} as Record<string, number>, exclusions: [] as string[], geography: 'Colombia', claimInstructions: [] as string[] },
    keyFeatures: [] as string[],
    recommendations: [] as string[],
    riskScore: 5,
    riskJustification: '',
    premiumTable: [] as any[],
    sourceQuotes: {} as Record<string, string>,
    redFlags: [] as string[],
    missingInfo: [] as string[]
  };

  const merged = results.reduce((acc, cur) => {
    // Prefer first non-empty policyType / insurer name/contact
    if (!acc.policyType && cur.policyType) acc.policyType = cur.policyType;
    if (!acc.insurer.name && cur.insurer?.name) acc.insurer.name = cur.insurer.name;
    if (!acc.insurer.contact && cur.insurer?.contact) acc.insurer.contact = cur.insurer.contact;
    if (Array.isArray(cur.insurer?.emergencyLines)) acc.insurer.emergencyLines = Array.from(new Set([...(acc.insurer.emergencyLines || []), ...cur.insurer.emergencyLines]));

    // Premium: pick first non-zero; keep currency/frequency if present
    if (acc.premium.amount === 0 && cur.premium?.amount) acc.premium.amount = cur.premium.amount;
    if (cur.premium?.currency) acc.premium.currency = cur.premium.currency;
    if (cur.premium?.frequency) acc.premium.frequency = cur.premium.frequency;

    // Policy details: fill missing fields, merge insured
    acc.policyDetails.policyNumber ||= cur.policyDetails?.policyNumber;
    acc.policyDetails.effectiveDate ||= cur.policyDetails?.effectiveDate;
    acc.policyDetails.expirationDate ||= cur.policyDetails?.expirationDate;
    if (Array.isArray(cur.policyDetails?.insured)) acc.policyDetails.insured = Array.from(new Set([...(acc.policyDetails.insured || []), ...cur.policyDetails.insured]));

    // Coverage merges
    if (cur.coverage?.geography) acc.coverage.geography = cur.coverage.geography;
    if (Array.isArray(cur.coverage?.claimInstructions)) acc.coverage.claimInstructions = Array.from(new Set([...(acc.coverage.claimInstructions || []), ...cur.coverage.claimInstructions]));
    if (cur.coverage?.limits) {
      for (const [k, v] of Object.entries(cur.coverage.limits)) {
        const num = typeof v === 'number' ? v : Number(v);
        if (!Number.isNaN(num)) acc.coverage.limits[k] = Math.max(acc.coverage.limits[k] || 0, num);
      }
    }
    if (cur.coverage?.deductibles) {
      for (const [k, v] of Object.entries(cur.coverage.deductibles)) {
        const num = typeof v === 'number' ? v : Number(v);
        if (!Number.isNaN(num)) acc.coverage.deductibles[k] = Math.max(acc.coverage.deductibles[k] || 0, num);
      }
    }
    if (Array.isArray(cur.coverage?.exclusions)) acc.coverage.exclusions = Array.from(new Set([...(acc.coverage.exclusions || []), ...cur.coverage.exclusions]));

    // Lists
    if (Array.isArray(cur.keyFeatures)) acc.keyFeatures = Array.from(new Set([...(acc.keyFeatures || []), ...cur.keyFeatures]));
    if (Array.isArray(cur.recommendations)) acc.recommendations = Array.from(new Set([...(acc.recommendations || []), ...cur.recommendations]));
    if (Array.isArray(cur.legal?.obligations)) acc.legal.obligations = Array.from(new Set([...(acc.legal.obligations || []), ...cur.legal.obligations]));
    if (Array.isArray(cur.legal?.complianceNotes)) acc.legal.complianceNotes = Array.from(new Set([...(acc.legal.complianceNotes || []), ...cur.legal.complianceNotes]));
    if (Array.isArray(cur.premiumTable)) acc.premiumTable = [ ...(acc.premiumTable || []), ...cur.premiumTable ];

    // Risk: keep max risk and concatenate justifications
    if (typeof cur.riskScore === 'number') acc.riskScore = Math.max(acc.riskScore || 0, cur.riskScore);
    if (cur.riskJustification) acc.riskJustification = [acc.riskJustification, cur.riskJustification].filter(Boolean).join(' | ');

    // Quotes, flags, missing
    if (cur.sourceQuotes) acc.sourceQuotes = { ...acc.sourceQuotes, ...cur.sourceQuotes };
    if (Array.isArray(cur.redFlags)) acc.redFlags = Array.from(new Set([...(acc.redFlags || []), ...cur.redFlags]));
    if (Array.isArray(cur.missingInfo)) acc.missingInfo = Array.from(new Set([...(acc.missingInfo || []), ...cur.missingInfo]));

    return acc;
  }, base);

  // Reasonable defaults
  if (!merged.coverage.geography) merged.coverage.geography = 'Colombia';

  // Normalize premiumTable amounts to integers (COP) if strings
  if (Array.isArray(merged.premiumTable)) {
    merged.premiumTable = merged.premiumTable.map((row: any) => {
      if (row && typeof row.amount === 'string') {
        const parsed = parseCopMoney(row.amount);
        if (parsed !== null) row.amount = parsed;
      }
      return row;
    });
  }
  return merged;
}

function postProcessAnalysis(pdfText: string, analysis: any, opts: { extractionMethod: 'text'|'ocr'; pdfPublicUrl: string | null }) {
  const result = { ...analysis };

  // Normalize premium and validate
  const contextLower = pdfText.toLowerCase();
  const near = (kw: RegExp) => kw.test(contextLower);

  // Normalize premium if zero: try regex parse
  if (!result.premium || !result.premium.amount || result.premium.amount === 0) {
    const match = /(?:COP|\$)\s*([0-9][0-9 .,:]{4,})/.exec(pdfText);
    if (match && match[1]) {
      const parsed = parseCopMoney(match[1]);
      if (parsed !== null && parsed > 0) {
        result.premium = result.premium || {};
        result.premium.amount = parsed;
        result.premium.currency = /USD/i.test(match[0]) ? 'USD' : 'COP';
        if (/mensual|mensualidad|month|mensuales/i.test(pdfText)) { result.premium.frequency = 'monthly'; result.premium.period = 'monthly'; }
        else if (/anual|annual|año|anualidad/i.test(pdfText)) { result.premium.frequency = 'yearly'; result.premium.period = 'annual'; }
        else { result.premium.frequency = 'unknown'; result.premium.period = 'unknown'; }
        result.premium.source = 'text';
      }
    }
    if (!result.premium?.amount || result.premium.amount === 0) {
      result.missingInfo = Array.from(new Set([...(result.missingInfo || []), 'Premium amount not clearly stated']))
    }
  }

  // Guardrails to avoid confusing sum insured with premium
  if (result.premium?.amount) {
    const nearSumAseg = /(suma asegurada|valor asegurado|sum insured)/i;
    if (near(nearSumAseg)) {
      // If the context is dominated by sum insured tokens and premium tokens are absent, mark unvalidated
      const hasPremiumTokens = /(prima|tarifa|mensualidad|anualidad|precio|costo)/i.test(contextLower);
      if (!hasPremiumTokens) {
        result.premium.validated = false;
        result.missingInfo = Array.from(new Set([...(result.missingInfo || []), 'Premium may be ambiguous (sum insured detected)']))
      } else {
        result.premium.validated = true;
      }
    } else {
      result.premium.validated = true;
    }
  }

  // Ensure geography default
  if (!result.coverage?.geography) {
    result.coverage = result.coverage || {};
    result.coverage.geography = 'Colombia';
  }

  // Check empties and flag
  const empties: string[] = [];
  if (!result.coverage || Object.keys(result.coverage.limits || {}).length === 0) empties.push('coverage.limits');
  if (!result.coverage || Object.keys(result.coverage.deductibles || {}).length === 0) empties.push('coverage.deductibles');
  if (!result.coverage || (result.coverage.exclusions || []).length === 0) empties.push('coverage.exclusions');
  if (!result.insurer?.contact) empties.push('insurer.contact');
  if (!result.insurer?.emergencyLines || result.insurer.emergencyLines.length === 0) empties.push('insurer.emergencyLines');
  if (!result.coverage?.claimInstructions || result.coverage.claimInstructions.length === 0) empties.push('coverage.claimInstructions');
  if (!result.policyDetails?.policyNumber) empties.push('policyDetails.policyNumber');
  if (!result.policyDetails?.expirationDate) empties.push('policyDetails.expirationDate');
  if (empties.length > 0) {
    result.missingInfo = Array.from(new Set([...(result.missingInfo || []), ...empties]));
  }

  // Risk justification fallback
  if (!result.riskJustification) {
    result.riskJustification = 'Justificación no especificada por el documento. Consulte exclusiones y deducibles.';
  }

  // OCR notes
  if (opts.extractionMethod === 'ocr') {
    result.missingInfo = Array.from(new Set([...(result.missingInfo || []), 'OCR was used; some text may not be captured accurately']))
  }

  return result;
}