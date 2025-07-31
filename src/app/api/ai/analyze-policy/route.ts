import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-analyzer';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { createPolicyUpload, updatePolicyUpload } from '@/lib/supabase-policy';
import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from '@/lib/supabase-server';

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
  riskScore: z.number().min(1).max(10).default(5)
});

export async function POST(request: NextRequest) {
  let uploadId: string | null = null;
  let serverSupabase: any = null;
  
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
      // Extract text from PDF
      console.log('📄 Extracting text from PDF...');
      const pdfText = await extractTextFromPDF(file);
      console.log('✅ PDF text extracted, length:', pdfText.length);

      // Update record with extracted text
      await updatePolicyUpload(uploadRecord.id, {
        extracted_text: pdfText,
        status: 'processing'
      }, serverSupabase);

      // Analyze with AI using generateObject for structured output
      console.log('🤖 Starting AI analysis...');
      const analysis = await analyzePolicyWithAI(pdfText, oai);
      console.log('✅ AI analysis completed');
      
      // Detect language for metadata
      const isSpanish = /[áéíóúñü]/i.test(pdfText) || 
                       /\b(el|la|los|las|de|del|con|por|para|en|es|son|está|están|tiene|tienen|puede|pueden|debe|deben|ser|estar|hacer|tener|ir|venir|dar|ver|saber|querer|poder|deber|hay|está|están|muy|más|menos|bien|mal|bueno|buena|malo|mala|grande|pequeño|nuevo|viejo|alto|bajo|largo|corto|ancho|estrecho|fuerte|débil|rico|pobre|feliz|triste|contento|enojado|cansado|despierto|limpio|sucio|caliente|frío|caluroso|fresco|seco|mojado|lleno|vacío|abierto|cerrado|nuevo|usado|caro|barato|fácil|difícil|importante|necesario|posible|imposible|correcto|incorrecto|verdadero|falso|cierto|seguro|claro|oscuro|brillante|opaco|transparente|visible|invisible|público|privado|nacional|internacional|local|global|especial|general|particular|común|raro|normal|extraño|usual|habitual|frecuente|ocasional|siempre|nunca|a veces|a menudo|raramente|casi|apenas|exactamente|aproximadamente|cerca|lejos|dentro|fuera|arriba|abajo|adelante|atrás|izquierda|derecha|centro|medio|mitad|parte|todo|nada|algo|nadie|alguien|cualquiera|cada|cual|cuál|qué|quién|dónde|cuándo|cómo|por qué|cuánto|cuánta|cuántos|cuántas)\b/i.test(pdfText);
      
      // Update record with AI summary and enhanced metadata
      await updatePolicyUpload(uploadRecord.id, {
        ai_summary: JSON.stringify(analysis),
        status: 'completed' as const,
        // Enhanced fields (these will be added by the migration)
        insurer_name: analysis.insurer?.name || '',
        insurer_contact: analysis.insurer?.contact || '',
        emergency_lines: analysis.insurer?.emergencyLines || [],
        policy_start_date: analysis.policyManagement?.startDate || null,
        policy_end_date: analysis.policyManagement?.endDate || null,
        policy_link: analysis.policyManagement?.policyLink || null,
        renewal_reminders: analysis.policyManagement?.renewalReminders || false,
        legal_obligations: analysis.legal?.obligations || [],
        compliance_notes: analysis.legal?.complianceNotes || [],
        coverage_geography: analysis.coverage?.geography || 'Colombia',
        claim_instructions: analysis.coverage?.claimInstructions || [],
        analysis_language: isSpanish ? 'Spanish' : 'English'
      }, serverSupabase);

      return NextResponse.json({
        success: true,
        analysis,
        fileName: file.name,
        uploadId: uploadRecord.id
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

async function analyzePolicyWithAI(pdfText: string, oai: any) {
  try {
    // Detect language from the PDF text
    const isSpanish = /[áéíóúñü]/i.test(pdfText) || 
                     /\b(el|la|los|las|de|del|con|por|para|en|es|son|está|están|tiene|tienen|puede|pueden|debe|deben|ser|estar|hacer|tener|ir|venir|dar|ver|saber|querer|poder|deber|hay|está|están|muy|más|menos|bien|mal|bueno|buena|malo|mala|grande|pequeño|nuevo|viejo|alto|bajo|largo|corto|ancho|estrecho|fuerte|débil|rico|pobre|feliz|triste|contento|enojado|cansado|despierto|limpio|sucio|caliente|frío|caluroso|fresco|seco|mojado|lleno|vacío|abierto|cerrado|nuevo|usado|caro|barato|fácil|difícil|importante|necesario|posible|imposible|correcto|incorrecto|verdadero|falso|cierto|seguro|claro|oscuro|brillante|opaco|transparente|visible|invisible|público|privado|nacional|internacional|local|global|especial|general|particular|común|raro|normal|extraño|usual|habitual|frecuente|ocasional|siempre|nunca|a veces|a menudo|raramente|casi|apenas|exactamente|aproximadamente|cerca|lejos|dentro|fuera|arriba|abajo|adelante|atrás|izquierda|derecha|centro|medio|mitad|parte|todo|nada|algo|nadie|alguien|cualquiera|cada|cual|cuál|qué|quién|dónde|cuándo|cómo|por qué|cuánto|cuánta|cuántos|cuántas)\b/i.test(pdfText);
    
    const language = isSpanish ? 'Spanish' : 'English';
    console.log(`🌐 Detected language: ${language}`);

    const systemPrompt = `You are an expert document analyst specializing in insurance policies. Analyze the provided document and extract comprehensive information.

IMPORTANT INSTRUCTIONS:
1. RESPOND IN ${language.toUpperCase()} - match the document's language
2. The document might be an insurance policy OR another type of document
3. Extract ALL available information, even if some fields are empty

FOR INSURANCE POLICIES, extract:
- Policy Type (health, life, auto, home, business, etc.)
- Premium details (amount, currency, frequency)
- Insurer information (name, contact, emergency lines)
- Policy management (dates, renewal info, policy links)
- Coverage details (limits, deductibles, geography, claim instructions)
- Legal obligations and compliance notes
- Exclusions and limitations
- Key features and benefits
- Risk assessment (1-10 scale)
- Recommendations and gaps

FOR NON-INSURANCE DOCUMENTS:
- Adapt the analysis creatively to fit the schema
- Focus on key points, risks, and actionable information
- Use fields like "insurer" for "company", "coverage" for "scope", etc.

ALWAYS provide meaningful analysis in ${language}.`;

    // Check if the PDF has no extractable text
    if (!pdfText.trim() || pdfText.includes('No text content could be extracted')) {
      console.log('⚠️ PDF has no extractable text content');
      throw new Error('This PDF appears to contain only images or has no extractable text. Please upload a PDF with text content.');
    }

    console.log('🤖 Sending text to AI for analysis...');
    console.log(`📄 Text length: ${pdfText.length} characters`);

    try {
      // Use generateObject for structured output
      const result = await generateObject({
        model: oai('gpt-4-turbo-preview'),
        system: systemPrompt,
        prompt: `Please analyze this document and provide a structured analysis:\n\n${pdfText.substring(0, 8000)}`, // Limit text length
        schema: PolicyAnalysisSchema,
        temperature: 0.3,
        maxTokens: 2000,
      });

      console.log('✅ AI analysis completed successfully');
      return result.object;
      
    } catch (schemaError) {
      console.error('⚠️ Schema validation failed, trying with fallback approach:', schemaError);
      
      // Fallback: Try with a more lenient approach
      const fallbackResult = await generateObject({
        model: oai('gpt-3.5-turbo'),
        system: systemPrompt,
        prompt: `Analyze this document. If it's not an insurance policy, adapt the analysis to fit the schema creatively:\n\n${pdfText.substring(0, 4000)}`,
        schema: PolicyAnalysisSchema,
        temperature: 0.5,
        maxTokens: 1500,
      });
      
      console.log('✅ Fallback AI analysis completed');
      return fallbackResult.object;
    }
    
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
      riskScore: 5
    };
  }
} 