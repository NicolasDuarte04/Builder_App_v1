import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-analyzer';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { createPolicyUpload, updatePolicyUpload } from '@/lib/supabase-policy';
import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Define the schema for the policy analysis
const PolicyAnalysisSchema = z.object({
  policyType: z.string(),
  premium: z.object({
    amount: z.number(),
    currency: z.string(),
    frequency: z.string()
  }),
  coverage: z.object({
    limits: z.record(z.number()),
    deductibles: z.record(z.number()),
    exclusions: z.array(z.string())
  }),
  policyDetails: z.object({
    policyNumber: z.string().optional(),
    effectiveDate: z.string().optional(),
    expirationDate: z.string().optional(),
    insured: z.array(z.string())
  }),
  keyFeatures: z.array(z.string()),
  recommendations: z.array(z.string()),
  riskScore: z.number().min(1).max(10)
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
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to analyze PDFs.' },
        { status: 401 }
      );
    }
    
    // Get user ID from session
    const sessionUser = session.user as any;
    const userId = sessionUser.id || sessionUser.email;
    
    if (!userId) {
      console.error('❌ No user ID found in session');
      return NextResponse.json(
        { error: 'User ID not found in session. Please log in again.' },
        { status: 401 }
      );
    }
    
    console.log('🔐 Using authenticated user ID:', userId);
    
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
    // Note: We now get userId from session, not from formData

    console.log('📋 Request details:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      userId: userId,
      userIdType: typeof userId,
      userIdLength: userId?.length,
      sessionUser: sessionUser.name || 'Unknown'
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
      
      // Update record with AI summary
      await updatePolicyUpload(uploadRecord.id, {
        ai_summary: JSON.stringify(analysis),
        status: 'completed'
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
    const systemPrompt = `You are an expert insurance policy analyst. Analyze the provided insurance policy document and extract key information in a structured format.

Extract and organize the following information:
1. Policy Type (health, life, auto, home, etc.)
2. Premium details (amount, currency, frequency)
3. Coverage limits and deductibles
4. Exclusions and limitations
5. Policy details (number, dates, insured parties)
6. Key features and benefits
7. Potential gaps or recommendations
8. Overall risk assessment (1-10 scale)

Be thorough and accurate in your analysis.`;

    // For now, return mock data if the PDF text is mock
    if (pdfText.includes('MOCK PDF CONTENT')) {
      console.log('⚠️ Using mock analysis for mock PDF content');
      return {
        policyType: "Health Insurance",
        premium: {
          amount: 150000,
          currency: "COP",
          frequency: "monthly"
        },
        coverage: {
          limits: {
            "Hospitalization": 50000000,
            "Outpatient": 10000000,
            "Medications": 5000000
          },
          deductibles: {
            "General": 50000,
            "Specialists": 100000
          },
          exclusions: [
            "Pre-existing conditions",
            "Cosmetic procedures",
            "Experimental treatments"
          ]
        },
        policyDetails: {
          policyNumber: "POL-2024-001",
          effectiveDate: "2024-01-01",
          expirationDate: "2024-12-31",
          insured: ["John Doe", "Jane Doe"]
        },
        keyFeatures: [
          "Network coverage nationwide",
          "Telemedicine included",
          "Prescription drug coverage",
          "Preventive care at 100%"
        ],
        recommendations: [
          "Consider increasing outpatient coverage",
          "Review medication coverage limits",
          "Add dental coverage if needed"
        ],
        riskScore: 7
      };
    }

    // Use generateObject for structured output with real PDF content
    const result = await generateObject({
      model: oai('gpt-4-turbo-preview'),
      system: systemPrompt,
      prompt: `Please analyze this insurance policy document:\n\n${pdfText.substring(0, 8000)}`, // Limit text length
      schema: PolicyAnalysisSchema,
      temperature: 0.3,
      maxTokens: 2000,
    });

    return result.object;
    
  } catch (error) {
    console.error('❌ Error in AI analysis:', error);
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 