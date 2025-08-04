import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDFWithOCR } from '@/lib/pdf-analyzer-enhanced';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
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
    
    console.log('🧪 Testing enhanced PDF analyzer...');
    
    const result = await extractTextFromPDFWithOCR(file);
    
    return NextResponse.json({
      success: true,
      method: result.method,
      textLength: result.text.length,
      preview: result.text.substring(0, 500) + '...',
      message: result.method === 'ocr' 
        ? 'Successfully extracted text using OCR' 
        : 'Successfully extracted text using standard method'
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}