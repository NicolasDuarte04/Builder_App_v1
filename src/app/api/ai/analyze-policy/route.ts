import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-analyzer';
import { extractTextFromPDFWithOCR, extractTextFromPDFOCROnly } from '@/lib/pdf-analyzer-enhanced';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { createPolicyUpload, updatePolicyUpload } from '@/lib/supabase-policy';
import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { parseCopMoney } from '@/lib/money';

  // Define the schema for the policy analysis - enhanced with user-relevant fields
const PolicyAnalysisSchema = z.object({
  policyType: z.string().default("Unknown"),
  premium: z.object({
    amount: z.number().default(0),
    currency: z.string().default("COP"),
    frequency: z.string().default("monthly")
  }).default({ amount: 0, currency: "COP", frequency: "monthly" }),
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
    } catch (error) {
      console.error('❌ Failed to create server Supabase client:', error);
      return NextResponse.json(
        { error: 'Database configuration error. Please check server logs.' },
        { status: 500 }
      );
    }
    
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    console.log('🔐 Session check:', session ? 'Authenticated' : 'Not authenticated');
    
    // Allow unauthenticated access in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';
    let userId: string;
    
    if (isDevelopment) {
      // Use a valid UUID for development mode
      userId = '00000000-0000-0000-0000-000000000000';
    } else {
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Authentication required. Please log in to analyze PDFs.' },
          { status: 401 }
        );
      }
      
      // Get user ID from session in production
      const sessionUser = session.user as any;
      userId = sessionUser.id || sessionUser.email;
      
      if (!userId) {
        console.error('❌ No user ID found in session');
        return NextResponse.json(
          { error: 'User ID not found in session. Please log in again.' },
          { status: 401 }
        );
      }
    }
    
    console.log('🔐 Using user ID:', userId, isDevelopment ? '(development mode)' : '(production mode)');
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return NextResponse.json(
        { error: 'AI service not configured. Please check server configuration.' },
        { status: 500 }
      );
    }

    const oai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const forceOcr = (formData.get('forceOcr') as string) === 'true';

    console.log('📋 Request details:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
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

    console.log('📄 Analyzing PDF policy:', file.name, 'for user:', userId);

    // Create initial upload record
    console.log('💾 Creating upload record in database...');
    const uploadRecord = await createPolicyUpload({
      user_id: userId,
      file_name: file.name,
      file_path: `uploads/${userId}/${Date.now()}_${file.name}`,
      extracted_text: '',
      status: 'uploading'
    }, serverSupabase);

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

    try {
      // Upload original PDF to Supabase Storage immediately (for traceability)
      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const safeName = `${userId}/${Date.now()}_${(file.name || 'policy').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { data: uploadData, error: storageError } = await serverSupabase.storage
          .from('policy-documents')
          .upload(safeName, buffer, { contentType: 'application/pdf', upsert: false });
        if (storageError) {
          console.warn('⚠️ Failed to upload PDF to storage:', storageError);
        } else {
          storagePath = uploadData.path;
          const { data: urlData } = serverSupabase.storage
            .from('policy-documents')
            .getPublicUrl(storagePath);
          pdfPublicUrl = urlData.publicUrl;
          // Best-effort: update policy_uploads with pdf_url if column exists
          try {
            await serverSupabase
              .from('policy_uploads')
              .update({ pdf_url: pdfPublicUrl, storage_path: storagePath })
              .eq('id', uploadRecord.id);
          } catch (e) {
            console.warn('⚠️ Could not set pdf_url/storage_path (missing columns?):', e);
          }
        }
      } catch (e) {
        console.warn('⚠️ Exception while uploading original PDF to storage (continuing):', e);
      }

      // Extract text from PDF with OCR fallback
      console.log('📄 Extracting text from PDF...');
      let pdfText: string;
      
      try {
        if (forceOcr) {
          console.log('🧾 Force OCR is enabled by user');
          const extractionResult = await extractTextFromPDFOCROnly(file);
          pdfText = extractionResult.text;
          extractionMethod = extractionResult.method;
        } else {
          // Try enhanced extraction with OCR fallback
          const extractionResult = await extractTextFromPDFWithOCR(file);
          pdfText = extractionResult.text;
          extractionMethod = extractionResult.method;
        }
        console.log(`✅ PDF text extracted using ${extractionMethod}, length: ${pdfText.length}`);
      } catch (enhancedError) {
        // If enhanced extraction fails, fall back to standard extraction
        console.log('⚠️ Enhanced extraction failed, trying standard method...');
        pdfText = await extractTextFromPDF(file);
        console.log('✅ PDF text extracted using standard method, length:', pdfText.length);
      }

      // Update record with extracted text
      await updatePolicyUpload(uploadRecord.id, {
        extracted_text: pdfText,
        status: 'processing'
      }, serverSupabase);

      // Analyze with AI using generateObject for structured output (supports chunking + merge)
      console.log('🤖 Starting AI analysis...');
      const analysis = await analyzePolicyWithAIMultiChunk(pdfText, oai);

      // Post-process and validate
      const finalAnalysis = postProcessAnalysis(pdfText, analysis, {
        extractionMethod,
        pdfPublicUrl,
      });
      console.log('✅ AI analysis completed');
      
      // Detect language for metadata
      const isSpanish = /[áéíóúñü]/i.test(pdfText) || 
                       /\b(el|la|los|las|de|del|con|por|para|en|es|son|está|están|tiene|tienen|puede|pueden|debe|deben|ser|estar|hacer|tener|ir|venir|dar|ver|saber|querer|poder|deber|hay|está|están|muy|más|menos|bien|mal|bueno|buena|malo|mala|grande|pequeño|nuevo|viejo|alto|bajo|largo|corto|ancho|estrecho|fuerte|débil|rico|pobre|feliz|triste|contento|enojado|cansado|despierto|limpio|sucio|caliente|frío|caluroso|fresco|seco|mojado|lleno|vacío|abierto|cerrado|nuevo|usado|caro|barato|fácil|difícil|importante|necesario|posible|imposible|correcto|incorrecto|verdadero|falso|cierto|seguro|claro|oscuro|brillante|opaco|transparente|visible|invisible|público|privado|nacional|internacional|local|global|especial|general|particular|común|raro|normal|extraño|usual|habitual|frecuente|ocasional|siempre|nunca|a veces|a menudo|raramente|casi|apenas|exactamente|aproximadamente|cerca|lejos|dentro|fuera|arriba|abajo|adelante|atrás|izquierda|derecha|centro|medio|mitad|parte|todo|nada|algo|nadie|alguien|cualquiera|cada|cual|cuál|qué|quién|dónde|cuándo|cómo|por qué|cuánto|cuánta|cuántos|cuántas)\b/i.test(pdfText);
      
      // Update record with AI summary and enhanced metadata
      await updatePolicyUpload(uploadRecord.id, {
        ai_summary: JSON.stringify(finalAnalysis),
        status: 'completed' as const,
        // Enhanced fields (these will be added by the migration)
        insurer_name: finalAnalysis.insurer?.name || '',
        insurer_contact: finalAnalysis.insurer?.contact || '',
        emergency_lines: finalAnalysis.insurer?.emergencyLines || [],
        policy_start_date: finalAnalysis.policyManagement?.startDate || null,
        policy_end_date: finalAnalysis.policyManagement?.endDate || null,
        policy_link: finalAnalysis.policyManagement?.policyLink || null,
        renewal_reminders: finalAnalysis.policyManagement?.renewalReminders || false,
        legal_obligations: finalAnalysis.legal?.obligations || [],
        compliance_notes: finalAnalysis.legal?.complianceNotes || [],
        coverage_geography: finalAnalysis.coverage?.geography || 'Colombia',
        claim_instructions: finalAnalysis.coverage?.claimInstructions || [],
        analysis_language: isSpanish ? 'Spanish' : 'English'
      }, serverSupabase);

      // Debug: summarize extraction & chunk info in dev
      const debugInfo = process.env.NODE_ENV !== 'production' ? {
        extraction: {
          method: extractionMethod,
          textLength: pdfText.length,
          head: pdfText.slice(0, 400),
          tail: pdfText.slice(-400)
        }
      } : undefined;

      return NextResponse.json({
        success: true,
        analysis: finalAnalysis,
        fileName: file.name,
        uploadId: uploadRecord.id,
        uploaderUserId: userId,
        storagePath: storagePath || undefined,
        extractionMethod: extractionMethod,
        pdfUrl: pdfPublicUrl || undefined,
        ...(debugInfo ? { debug: debugInfo } : {})
      });

    } catch (error) {
      // Update record with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during analysis';
      console.error('❌ Error during analysis:', errorMessage);
      
      await updatePolicyUpload(uploadRecord.id, {
        status: 'error',
        error_message: errorMessage
      }, serverSupabase);

      throw error;
    }

  } catch (error) {
    console.error('❌ Error analyzing policy:', error);
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      error: 'Failed to analyze policy',
      details: errorMessage,
      uploadId: uploadId,
      timestamp: new Date().toISOString()
    };

    // Log the full error for debugging
    console.error('Full error details:', errorDetails);
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}

// Split long documents by headings and chunk length, analyze per chunk, and merge results
async function analyzePolicyWithAIMultiChunk(pdfText: string, oai: any) {
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
    const MAX_CHUNKS = 3; // bound for latency
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
          model: oai('gpt-4-turbo-preview'),
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
          model: oai('gpt-3.5-turbo'),
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
    const prompts = selectedChunks.map((chunk, idx) => (
      `Section ${idx + 1}/${selectedChunks.length} — ${chunk.title || 'Untitled section'}\n\n` +
      `Analyze ONLY this section faithfully. DO NOT invent details not present in this section. ` +
      `If a field is not present in this section, leave it empty and add a descriptive message to missingInfo indicating it was not found in section ${idx + 1}.\n\n` +
      chunk.text.substring(0, 7500)
    ));

    const calls = prompts.map(async (prompt) => {
      try {
        const r = await generateObject({
          model: oai('gpt-4-turbo-preview'),
          system: systemPrompt,
          prompt,
          schema: PolicyAnalysisSchema,
          temperature: 0.2,
          maxTokens: 1200,
        });
        return r.object;
      } catch (err) {
        console.warn('⚠️ Chunk analysis failed, using gpt-3.5 fallback for this chunk');
        const r = await generateObject({
          model: oai('gpt-3.5-turbo'),
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

  // Normalize premium if zero: try regex parse
  if (!result.premium || !result.premium.amount || result.premium.amount === 0) {
    const match = /(?:COP|\$)\s*([0-9][0-9 .,:]{4,})/.exec(pdfText);
    if (match && match[1]) {
      const parsed = parseCopMoney(match[1]);
      if (parsed !== null && parsed > 0) {
        result.premium = result.premium || {};
        result.premium.amount = parsed;
        result.premium.currency = /USD/i.test(match[0]) ? 'USD' : 'COP';
        if (!result.premium.frequency) {
          if (/mensual|month|mensuales/i.test(pdfText)) result.premium.frequency = 'monthly';
          else if (/anual|annual|año/i.test(pdfText)) result.premium.frequency = 'yearly';
          else result.premium.frequency = 'unknown';
        }
      }
    }
    if (!result.premium?.amount || result.premium.amount === 0) {
      result.missingInfo = Array.from(new Set([...(result.missingInfo || []), 'Premium amount not clearly stated']))
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