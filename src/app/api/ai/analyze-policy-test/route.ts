import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-analyzer';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Create a Supabase client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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
  
  try {
    console.log('📋 Starting PDF analysis TEST request...');
    
    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Supabase service role key not configured');
      return NextResponse.json(
        { error: 'Test endpoint requires service role key configuration.' },
        { status: 500 }
      );
    }

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
    const userId = formData.get('userId') as string;

    console.log('📋 TEST Request details:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      userId: userId,
      userIdType: typeof userId,
      userIdLength: userId?.length
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

    if (!userId) {
      console.error('❌ No user ID provided in request');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('📄 Analyzing PDF policy:', file.name, 'for user:', userId);

    // Create initial upload record using admin client (bypasses RLS)
    console.log('💾 Creating upload record in database (TEST MODE - bypassing RLS)...');
    
    const { data: uploadRecord, error: insertError } = await supabaseAdmin
      .from('policy_uploads')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_path: `uploads/${userId}/${Date.now()}_${file.name}`,
        extracted_text: '',
        status: 'uploading'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create upload record:', insertError);
      return NextResponse.json(
        { 
          error: 'Failed to create upload record',
          details: insertError.message,
          hint: insertError.hint 
        },
        { status: 500 }
      );
    }

    if (!uploadRecord) {
      console.error('❌ No upload record returned');
      return NextResponse.json(
        { error: 'Failed to create upload record - no data returned' },
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
      const { error: updateError1 } = await supabaseAdmin
        .from('policy_uploads')
        .update({
          extracted_text: pdfText,
          status: 'processing'
        })
        .eq('id', uploadRecord.id);

      if (updateError1) {
        console.error('❌ Failed to update with extracted text:', updateError1);
      }

      // Analyze with AI using generateObject for structured output
      console.log('🤖 Starting AI analysis...');
      const analysis = await analyzePolicyWithAI(pdfText, oai);
      console.log('✅ AI analysis completed');
      
      // Update record with AI summary
      const { error: updateError2 } = await supabaseAdmin
        .from('policy_uploads')
        .update({
          ai_summary: JSON.stringify(analysis),
          status: 'completed'
        })
        .eq('id', uploadRecord.id);

      if (updateError2) {
        console.error('❌ Failed to update with AI summary:', updateError2);
      }

      return NextResponse.json({
        success: true,
        analysis,
        fileName: file.name,
        uploadId: uploadRecord.id,
        testMode: true
      });

    } catch (error) {
      // Update record with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during analysis';
      console.error('❌ Error during analysis:', errorMessage);
      
      await supabaseAdmin
        .from('policy_uploads')
        .update({
          status: 'error',
          error_message: errorMessage
        })
        .eq('id', uploadRecord.id);

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
      timestamp: new Date().toISOString(),
      testMode: true
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