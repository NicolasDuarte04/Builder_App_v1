export interface PolicyAnalysis {
  policyType: string;
  premium: {
    amount: number;
    currency: string;
    frequency: string;
  };
  coverage: {
    limits: Record<string, number>;
    deductibles: Record<string, number>;
    exclusions: string[];
  };
  policyDetails: {
    policyNumber?: string;
    effectiveDate?: string;
    expirationDate?: string;
    insured: string[];
  };
  keyFeatures: string[];
  recommendations: string[];
  riskScore: number; // 1-10 scale
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log('📄 Extracting text from PDF:', file.name, 'Size:', file.size);
    
    // Basic file validation
    if (file.type !== 'application/pdf') {
      throw new Error('Invalid file type. Only PDF files are supported.');
    }
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('📄 Starting PDF text extraction...');
    
    // Use dynamic import to avoid build issues
    const PDFParser = (await import('pdf2json')).default;
    
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      
      // Set up event handlers
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('❌ PDF parsing error:', errData.parserError);
        reject(new Error(`PDF parsing failed: ${errData.parserError}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          console.log('📄 PDF data ready, extracting text...');
          
          // Extract text from all pages
          let fullText = '';
          const pages = pdfData.Pages || [];
          
          console.log(`📄 Processing ${pages.length} pages...`);
          
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            let pageText = '';
            
            // Extract text from each text element
            if (page.Texts) {
              for (const textItem of page.Texts) {
                if (textItem.R) {
                  for (const textRun of textItem.R) {
                    if (textRun.T) {
                      // Decode URI component to get actual text
                      const decodedText = decodeURIComponent(textRun.T);
                      pageText += decodedText + ' ';
                    }
                  }
                }
              }
            }
            
            if (pageText.trim()) {
              fullText += `\n--- Page ${i + 1} ---\n${pageText.trim()}\n`;
            }
          }
          
          // Clean up the text
          fullText = fullText
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up multiple newlines
            .trim();
          
          console.log(`✅ Successfully extracted ${fullText.length} characters from ${pages.length} pages`);
          
          if (!fullText || fullText.length < 50) {
            console.warn('⚠️ No meaningful text content found in PDF');
            reject(new Error('No text content could be extracted from this PDF. The file might contain only images or be a scanned document.'));
            return;
          }
          
          console.log('📄 First 300 characters:', fullText.substring(0, 300) + '...');
          resolve(fullText);
        } catch (error) {
          console.error('❌ Error processing PDF data:', error);
          reject(new Error(`Failed to process PDF data: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
      
      // Parse the PDF buffer
      console.log('📄 Starting PDF parsing...');
      pdfParser.parseBuffer(buffer);
    });
  } catch (error) {
    console.error('❌ Error extracting PDF text:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        throw new Error('The PDF file appears to be corrupted or invalid.');
      }
      if (error.message.includes('Password') || error.message.includes('Encrypted')) {
        throw new Error('This PDF is password protected. Please remove the password protection and try again.');
      }
      if (error.message.includes('No text content')) {
        throw error; // Re-throw our custom error
      }
      // For other errors, include the original message
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
    
    throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF document.');
  }
}

export async function analyzeInsurancePolicy(pdfText: string): Promise<PolicyAnalysis> {
  // This is now handled by the AI in the API route
  // This function is no longer used but kept for backwards compatibility
  console.warn('analyzeInsurancePolicy is deprecated. Analysis is now done by AI in the API route.');
  
  return {
    policyType: "Unknown",
    premium: {
      amount: 0,
      currency: "COP",
      frequency: "unknown"
    },
    coverage: {
      limits: {},
      deductibles: {},
      exclusions: []
    },
    policyDetails: {
      insured: []
    },
    keyFeatures: [],
    recommendations: [],
    riskScore: 5
  };
} 