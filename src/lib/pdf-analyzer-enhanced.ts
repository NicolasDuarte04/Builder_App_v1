import { PolicyAnalysis } from './pdf-analyzer';

export interface EnhancedPolicyAnalysis extends PolicyAnalysis {
  sourceQuotes: Record<string, string>;
  redFlags: string[];
  missingInfo: string[];
  extractionMethod: 'text' | 'ocr';
}

/**
 * Enhanced PDF text extraction with OCR fallback
 * This function first tries standard text extraction, then falls back to OCR if needed
 */
export async function extractTextFromPDFWithOCR(file: File): Promise<{ text: string; method: 'text' | 'ocr' }> {
  try {
    console.log('📄 Starting enhanced PDF extraction for:', file.name);
    
    // First, try standard text extraction
    const { extractTextFromPDF } = await import('./pdf-analyzer');
    
    try {
      const text = await extractTextFromPDF(file);
      
      // Check if we got meaningful text
      if (text && text.length > 100) {
        console.log('✅ Successfully extracted text using standard method');
        return { text, method: 'text' };
      }
      
      console.log('⚠️ Text extraction returned minimal content, attempting OCR...');
    } catch (textError) {
      console.log('⚠️ Standard text extraction failed, attempting OCR...', textError);
    }
    
    // If standard extraction fails or returns minimal text, try OCR
    return await performOCR(file);
    
  } catch (error) {
    console.error('❌ Enhanced PDF extraction failed:', error);
    throw new Error(`Failed to extract content from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Perform OCR on a PDF file using Tesseract.js
 */
async function performOCR(file: File): Promise<{ text: string; method: 'ocr' }> {
  console.log('🔍 Starting OCR processing...');
  
  try {
    // Convert PDF to images first
    const pdfImages = await convertPDFToImages(file);
    
    if (pdfImages.length === 0) {
      console.log('⚠️ No images extracted from PDF, OCR cannot proceed');
      throw new Error('Failed to convert PDF to images for OCR processing');
    }
    
    console.log(`📸 Converted PDF to ${pdfImages.length} images`);
    
    // Dynamic import of Tesseract to avoid build issues
    const Tesseract = (await import('tesseract.js')).default;
    
    // Create a worker
    const worker = await Tesseract.createWorker({
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`🔍 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    // Initialize the worker with Spanish and English
    await worker.loadLanguage('spa+eng');
    await worker.initialize('spa+eng');
    
    let fullText = '';
    
    // Process each page
    for (let i = 0; i < pdfImages.length; i++) {
      console.log(`🔍 Processing page ${i + 1}/${pdfImages.length}...`);
      
      // Convert Buffer to Uint8Array for Tesseract
      const imageData = new Uint8Array(pdfImages[i]);
      
      const { data: { text } } = await worker.recognize(imageData);
      
      if (text && text.trim()) {
        fullText += `\n--- Page ${i + 1} ---\n${text.trim()}\n`;
      }
    }
    
    await worker.terminate();
    
    // Clean up the extracted text
    fullText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    console.log(`✅ OCR completed. Extracted ${fullText.length} characters`);
    
    if (!fullText || fullText.length < 50) {
      throw new Error('OCR failed to extract meaningful text from the PDF');
    }
    
    return { text: fullText, method: 'ocr' };
    
  } catch (error) {
    console.error('❌ OCR processing failed:', error);
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert PDF pages to images for OCR processing
 */
async function convertPDFToImages(file: File): Promise<Buffer[]> {
  try {
    console.log('🔄 Converting PDF to images for OCR...');
    
    // For Node.js environment, we'll use pdf-to-png-converter
    const { pdf } = await import('pdf-to-png-converter');
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Convert PDF to PNG images
    const options = {
      disableFontFace: true, // Disable font face to avoid errors
      useSystemFonts: true,  // Use system fonts
      viewportScale: 2.0,    // Higher resolution for better OCR
    };
    
    console.log('📄 Starting PDF to PNG conversion...');
    const pngPages = await pdf(buffer, options);
    
    console.log(`✅ Converted ${pngPages.length} pages to images`);
    
    // Return the image buffers
    return pngPages.map(page => page.content);
    
  } catch (error) {
    console.error('❌ PDF to image conversion failed:', error);
    
    // If pdf-to-png-converter fails, try a fallback approach
    console.log('⚠️ Trying fallback PDF extraction method...');
    
    // Return empty array to indicate conversion failure
    return [];
  }
}

/**
 * Compare two insurance policies and return differences
 */
export function comparePolicies(
  policyA: EnhancedPolicyAnalysis,
  policyB: EnhancedPolicyAnalysis
): {
  differences: {
    field: string;
    valueA: any;
    valueB: any;
    comparison: string;
  }[];
  recommendations: string[];
} {
  const differences: any[] = [];
  const recommendations: string[] = [];
  
  // Compare premiums
  if (policyA.premium.amount !== policyB.premium.amount) {
    const diff = policyB.premium.amount - policyA.premium.amount;
    differences.push({
      field: 'premium.amount',
      valueA: policyA.premium.amount,
      valueB: policyB.premium.amount,
      comparison: diff > 0 ? `Policy B is ${Math.abs(diff)} ${policyA.premium.currency} more expensive` : `Policy A is ${Math.abs(diff)} ${policyA.premium.currency} more expensive`
    });
  }
  
  // Compare coverage limits
  const limitsA = Object.keys(policyA.coverage.limits);
  const limitsB = Object.keys(policyB.coverage.limits);
  const allLimits = new Set([...limitsA, ...limitsB]);
  
  allLimits.forEach(limitType => {
    const limitA = policyA.coverage.limits[limitType] || 0;
    const limitB = policyB.coverage.limits[limitType] || 0;
    
    if (limitA !== limitB) {
      differences.push({
        field: `coverage.limits.${limitType}`,
        valueA: limitA,
        valueB: limitB,
        comparison: limitB > limitA ? `Policy B offers ${limitB - limitA} more coverage` : `Policy A offers ${limitA - limitB} more coverage`
      });
    }
  });
  
  // Compare deductibles
  const deductiblesA = Object.keys(policyA.coverage.deductibles);
  const deductiblesB = Object.keys(policyB.coverage.deductibles);
  const allDeductibles = new Set([...deductiblesA, ...deductiblesB]);
  
  allDeductibles.forEach(deductibleType => {
    const deductibleA = policyA.coverage.deductibles[deductibleType] || 0;
    const deductibleB = policyB.coverage.deductibles[deductibleType] || 0;
    
    if (deductibleA !== deductibleB) {
      differences.push({
        field: `coverage.deductibles.${deductibleType}`,
        valueA: deductibleA,
        valueB: deductibleB,
        comparison: deductibleB > deductibleA ? `Policy B has a higher deductible (${deductibleB - deductibleA} more)` : `Policy A has a higher deductible (${deductibleA - deductibleB} more)`
      });
    }
  });
  
  // Compare exclusions
  const exclusionsA = new Set(policyA.coverage.exclusions);
  const exclusionsB = new Set(policyB.coverage.exclusions);
  
  const onlyInA = [...exclusionsA].filter(x => !exclusionsB.has(x));
  const onlyInB = [...exclusionsB].filter(x => !exclusionsA.has(x));
  
  if (onlyInA.length > 0) {
    differences.push({
      field: 'coverage.exclusions',
      valueA: onlyInA,
      valueB: [],
      comparison: `Policy A excludes: ${onlyInA.join(', ')}`
    });
  }
  
  if (onlyInB.length > 0) {
    differences.push({
      field: 'coverage.exclusions',
      valueA: [],
      valueB: onlyInB,
      comparison: `Policy B excludes: ${onlyInB.join(', ')}`
    });
  }
  
  // Compare risk scores
  if (policyA.riskScore !== policyB.riskScore) {
    differences.push({
      field: 'riskScore',
      valueA: policyA.riskScore,
      valueB: policyB.riskScore,
      comparison: policyB.riskScore > policyA.riskScore ? 'Policy B has higher risk' : 'Policy A has higher risk'
    });
  }
  
  // Generate recommendations based on differences
  if (differences.length > 0) {
    // Premium vs coverage analysis
    const premiumDiff = policyB.premium.amount - policyA.premium.amount;
    const hasBetterCoverage = limitsB.length > limitsA.length || 
      Object.values(policyB.coverage.limits).reduce((a, b) => a + b, 0) > 
      Object.values(policyA.coverage.limits).reduce((a, b) => a + b, 0);
    
    if (premiumDiff > 0 && hasBetterCoverage) {
      recommendations.push('Policy B offers better coverage but at a higher premium. Consider if the additional coverage justifies the cost.');
    } else if (premiumDiff < 0 && !hasBetterCoverage) {
      recommendations.push('Policy A is more expensive but may not offer proportionally better coverage. Review if you need all features.');
    }
    
    // Deductible analysis
    const avgDeductibleA = Object.values(policyA.coverage.deductibles).reduce((a, b) => a + b, 0) / (deductiblesA.length || 1);
    const avgDeductibleB = Object.values(policyB.coverage.deductibles).reduce((a, b) => a + b, 0) / (deductiblesB.length || 1);
    
    if (avgDeductibleB > avgDeductibleA * 1.5) {
      recommendations.push('Policy B has significantly higher deductibles. Ensure you can afford these out-of-pocket costs.');
    }
    
    // Risk score analysis
    if (policyA.riskScore >= 7 && policyB.riskScore >= 7) {
      recommendations.push('Both policies have high risk scores. Consider looking for additional options with better coverage.');
    }
  }
  
  return { differences, recommendations };
}