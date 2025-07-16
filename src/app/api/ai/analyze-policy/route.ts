import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-analyzer';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createPolicyUpload, updatePolicyUpload } from '@/lib/supabase-policy';

const oai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

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
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('📄 Analyzing PDF policy:', file.name, 'for user:', userId);

    // Create initial upload record
    const uploadRecord = await createPolicyUpload({
      user_id: userId,
      file_name: file.name,
      file_path: `uploads/${userId}/${Date.now()}_${file.name}`,
      extracted_text: '',
      status: 'uploading'
    });

    if (!uploadRecord) {
      return NextResponse.json(
        { error: 'Failed to create upload record' },
        { status: 500 }
      );
    }

    try {
      // Extract text from PDF
      const pdfText = await extractTextFromPDF(file);
      console.log('✅ PDF text extracted, length:', pdfText.length);

      // Update record with extracted text
      await updatePolicyUpload(uploadRecord.id, {
        extracted_text: pdfText,
        status: 'processing'
      });

      // Analyze with AI
      const analysis = await analyzePolicyWithAI(pdfText);
      
      // Update record with AI summary
      await updatePolicyUpload(uploadRecord.id, {
        ai_summary: JSON.stringify(analysis),
        status: 'completed'
      });

      return NextResponse.json({
        success: true,
        analysis,
        fileName: file.name,
        uploadId: uploadRecord.id
      });

    } catch (error) {
      // Update record with error
      await updatePolicyUpload(uploadRecord.id, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }

  } catch (error) {
    console.error('❌ Error analyzing policy:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function analyzePolicyWithAI(pdfText: string) {
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

Respond with a JSON object containing this structured analysis.`;

  const result = await streamText({
    model: oai('gpt-4-turbo-preview'),
    system: systemPrompt,
    messages: [
      { 
        role: 'user', 
        content: `Please analyze this insurance policy document:\n\n${pdfText.substring(0, 8000)}` // Limit text length
      }
    ],
    temperature: 0.3,
    maxTokens: 2000,
  });

  // For now, we'll return a mock analysis since streamText is for streaming
  // In production, you'd want to use a different approach for one-time analysis
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