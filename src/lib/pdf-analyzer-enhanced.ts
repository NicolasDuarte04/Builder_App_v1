import type { PolicyAnalysis } from './pdf-analyzer';
import { PDF_THUMBS_ENABLED } from '@/lib/featureFlags';

// Server-only guard to avoid accidental client bundling/execution
if (typeof window !== 'undefined') {
  throw new Error('Este módulo es solo para el servidor. No lo importes en el navegador (pdf-analyzer-enhanced).');
}

export interface EnhancedPolicyAnalysis extends PolicyAnalysis {
  sourceQuotes: Record<string, string>;
  redFlags: string[];
  missingInfo: string[];
  extractionMethod: 'text' | 'ocr';
}

// Constants for file size limits
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MIN_TEXT_LENGTH_FOR_SUCCESS = 100;
const MIN_OCR_TEXT_LENGTH = 50;

// Error types for better error handling
export class PDFAnalysisError extends Error {
  constructor(
    message: string,
    public code: 'FILE_TOO_LARGE' | 'NO_TEXT_EXTRACTED' | 'OCR_FAILED' | 'DEPENDENCY_MISSING' | 'INVALID_FILE' | 'PROCESSING_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'PDFAnalysisError';
  }
}

// Progress callback type
export type ProgressCallback = (message: string, progress?: number) => void;

// Extraction result interface
export interface ExtractionResult {
  text: string;
  method: 'text' | 'ocr';
  warnings?: string[];
  processingTime?: number;
  pageCount?: number;
}

// Utility function to check if OCR is available
export async function isOCRAvailable(): Promise<boolean> {
  try {
    if (!PDF_THUMBS_ENABLED) {
      return false;
    }
    
    // Try to import both dependencies
    await import('tesseract.js');
    await import('pdf-to-png-converter');
    return true;
  } catch {
    return false;
  }
}

// Utility function to get user-friendly error messages
export function getErrorMessage(error: PDFAnalysisError): string {
  switch (error.code) {
    case 'FILE_TOO_LARGE':
      return `El archivo es demasiado grande. Por favor, sube un archivo menor a ${MAX_FILE_SIZE_MB}MB.`;
    case 'INVALID_FILE':
      return 'El archivo no es un PDF válido. Por favor, verifica que el archivo esté en formato PDF.';
    case 'NO_TEXT_EXTRACTED':
      return 'No se pudo extraer texto del PDF. Esto puede deberse a que el documento está protegido, corrupto, o contiene solo imágenes.';
    case 'OCR_FAILED':
      return 'El procesamiento OCR falló. Esto puede deberse a imágenes de baja calidad o texto muy pequeño en el PDF.';
    case 'DEPENDENCY_MISSING':
      return 'Las herramientas de procesamiento avanzado no están disponibles en este entorno. Intenta con un PDF que contenga texto seleccionable.';
    case 'PROCESSING_ERROR':
    default:
      return 'Ocurrió un error durante el procesamiento del PDF. Por favor, intenta nuevamente.';
  }
}

/**
 * Enhanced PDF text extraction with OCR fallback
 * This function first tries standard text extraction, then falls back to OCR if needed
 */
export async function extractTextFromPDFWithOCR(
  file: File, 
  options: { 
    onProgress?: ProgressCallback;
    forceOCR?: boolean;
  } = {}
): Promise<ExtractionResult> {
  const { onProgress, forceOCR = false } = options;
  const warnings: string[] = [];
  const startTime = Date.now();
  
  try {
    onProgress?.('Validando archivo PDF...', 0);
    console.log('📄 Starting enhanced PDF extraction for:', file.name);
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new PDFAnalysisError(
        `El archivo es demasiado grande (${Math.round(file.size / 1024 / 1024)}MB). El límite máximo es ${MAX_FILE_SIZE_MB}MB.`,
        'FILE_TOO_LARGE',
        { fileSize: file.size, maxSize: MAX_FILE_SIZE_BYTES }
      );
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new PDFAnalysisError(
        'Tipo de archivo inválido. Solo se permiten archivos PDF.',
        'INVALID_FILE',
        { fileType: file.type }
      );
    }
    
    onProgress?.('Extrayendo texto del PDF...', 10);
    
    // First, try standard text extraction unless OCR is forced
    if (!forceOCR) {
      try {
        const { extractTextFromPDF } = await import('./pdf-analyzer');
        const text = await extractTextFromPDF(file);
        
        // Check if we got meaningful text
        if (text && text.length > MIN_TEXT_LENGTH_FOR_SUCCESS) {
          console.log('✅ Successfully extracted text using standard method');
          onProgress?.('Texto extraído exitosamente', 100);
          const processingTime = Date.now() - startTime;
          return { 
            text, 
            method: 'text', 
            warnings: warnings.length > 0 ? warnings : undefined,
            processingTime,
            pageCount: 1 // Standard extraction doesn't provide page count
          };
        }
        
        console.log('⚠️ Text extraction returned minimal content, attempting OCR...');
        warnings.push('Extracción de texto estándar devolvió contenido mínimo, intentando OCR...');
        onProgress?.('Contenido mínimo detectado, intentando OCR...', 30);
      } catch (textError) {
        console.log('⚠️ Standard text extraction failed, attempting OCR...', textError);
        warnings.push('Extracción de texto estándar falló, intentando OCR...');
        onProgress?.('Extracción estándar falló, intentando OCR...', 30);
      }
    } else {
      onProgress?.('OCR forzado por el usuario...', 30);
      warnings.push('OCR forzado por el usuario');
    }
    
    // If standard extraction fails or returns minimal text, try OCR
    const ocrResult = await performOCR(file, { onProgress, warnings });
    const processingTime = Date.now() - startTime;
    
    return {
      ...ocrResult,
      processingTime
    };
    
  } catch (error) {
    console.error('❌ Enhanced PDF extraction failed:', error);
    
    if (error instanceof PDFAnalysisError) {
      throw error;
    }
    
    throw new PDFAnalysisError(
      `Error al extraer contenido del PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      'PROCESSING_ERROR',
      { originalError: error }
    );
  }
}

// Exported helper to force OCR-only path when caller knows the PDF is scanned
export async function extractTextFromPDFOCROnly(
  file: File,
  options: { onProgress?: ProgressCallback } = {}
): Promise<ExtractionResult> {
  const { onProgress } = options;
  const startTime = Date.now();
  const result = await performOCR(file, { onProgress, warnings: [] });
  const processingTime = Date.now() - startTime;
  
  return {
    ...result,
    processingTime
  };
}

/**
 * Perform OCR on a PDF file using Tesseract.js
 */
async function performOCR(
  file: File, 
  options: { 
    onProgress?: ProgressCallback;
    warnings?: string[];
  } = {}
): Promise<{ text: string; method: 'ocr'; warnings?: string[]; pageCount?: number }> {
  const { onProgress, warnings = [] } = options;
  
  console.log('🔍 Starting OCR processing...');
  onProgress?.('Iniciando procesamiento OCR...', 40);
  
  try {
    // Check if OCR dependencies are available
    onProgress?.('Verificando dependencias OCR...', 45);
    
    // Convert PDF to images first
    onProgress?.('Convirtiendo PDF a imágenes...', 50);
    const pdfImages = await convertPDFToImages(file, { onProgress, warnings });
    
    if (pdfImages.length === 0) {
      const errorMsg = 'No se pudieron extraer imágenes del PDF para procesamiento OCR. Esto puede deberse a que el PDF está protegido o corrupto.';
      console.log('⚠️ No images extracted from PDF, OCR cannot proceed');
      warnings.push('No se pudieron extraer imágenes del PDF para OCR');
      throw new PDFAnalysisError(errorMsg, 'OCR_FAILED', { 
        reason: 'no_images_extracted',
        fileSize: file.size,
        fileName: file.name 
      });
    }
    
    console.log(`📸 Converted PDF to ${pdfImages.length} images`);
    onProgress?.(`PDF convertido a ${pdfImages.length} imágenes`, 60);
    
    // Dynamic import of Tesseract to avoid build issues
    onProgress?.('Cargando motor OCR...', 65);
    let Tesseract;
    try {
      Tesseract = (await import('tesseract.js')).default;
    } catch (importError) {
      const errorMsg = 'El motor OCR no está disponible en este entorno. Esto es común en entornos serverless.';
      console.warn('⚠️ Tesseract.js not available:', importError);
      warnings.push('Motor OCR no disponible en este entorno');
      throw new PDFAnalysisError(errorMsg, 'DEPENDENCY_MISSING', { 
        dependency: 'tesseract.js',
        importError: importError instanceof Error ? importError.message : String(importError)
      });
    }
    
    // Create a worker
    onProgress?.('Inicializando motor OCR...', 70);
    const worker = await (Tesseract as any).createWorker({
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const progress = Math.round(m.progress * 100);
          console.log(`🔍 OCR Progress: ${progress}%`);
          onProgress?.(`Procesando texto con OCR: ${progress}%`, 70 + (progress * 0.25));
        }
      }
    });
    
    // Initialize the worker with Spanish and English
    onProgress?.('Configurando idiomas (Español + Inglés)...', 75);
    await (worker as any).loadLanguage('spa+eng');
    await (worker as any).initialize('spa+eng');
    
    let fullText = '';
    
    // Process each page
    for (let i = 0; i < pdfImages.length; i++) {
      const pageProgress = 75 + ((i / pdfImages.length) * 20);
      onProgress?.(`Procesando página ${i + 1}/${pdfImages.length}...`, pageProgress);
      console.log(`🔍 Processing page ${i + 1}/${pdfImages.length}...`);
      
      // Convert Buffer to Uint8Array for Tesseract
      const imageData = new Uint8Array(pdfImages[i]);
      
      const { data: { text } } = await (worker as any).recognize(imageData);
      
      if (text && text.trim()) {
        fullText += `\n--- Page ${i + 1} ---\n${text.trim()}\n`;
      } else {
        warnings.push(`Página ${i + 1} no produjo texto reconocible`);
      }
    }
    
    onProgress?.('Finalizando procesamiento OCR...', 95);
    await (worker as any).terminate();
    
    // Clean up the extracted text
    fullText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    console.log(`✅ OCR completed. Extracted ${fullText.length} characters`);
    
    if (!fullText || fullText.length < MIN_OCR_TEXT_LENGTH) {
      const errorMsg = `OCR no pudo extraer texto significativo del PDF. Solo se extrajeron ${fullText.length} caracteres. Esto puede indicar que el PDF contiene principalmente imágenes de baja calidad o texto muy pequeño.`;
      warnings.push('OCR extrajo muy poco texto del documento');
      throw new PDFAnalysisError(errorMsg, 'NO_TEXT_EXTRACTED', { 
        extractedLength: fullText.length,
        minRequired: MIN_OCR_TEXT_LENGTH,
        pageCount: pdfImages.length
      });
    }
    
    if (fullText.length < MIN_TEXT_LENGTH_FOR_SUCCESS) {
      warnings.push('OCR extrajo texto limitado - la precisión puede ser reducida');
    }
    
    onProgress?.('OCR completado exitosamente', 100);
    return { 
      text: fullText, 
      method: 'ocr', 
      warnings: warnings.length > 0 ? warnings : undefined,
      pageCount: pdfImages.length
    };
    
  } catch (error) {
    console.error('❌ OCR processing failed:', error);
    
    if (error instanceof PDFAnalysisError) {
      throw error;
    }
    
    throw new PDFAnalysisError(
      `Error en procesamiento OCR: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      'OCR_FAILED',
      { originalError: error, fileName: file.name, fileSize: file.size }
    );
  }
}

/**
 * Convert PDF pages to images for OCR processing
 */
async function convertPDFToImages(
  file: File, 
  options: { 
    onProgress?: ProgressCallback;
    warnings?: string[];
  } = {}
): Promise<Buffer[]> {
  const { onProgress, warnings = [] } = options;
  
  try {
    console.log('🔄 Converting PDF to images for OCR...');
    onProgress?.('Verificando configuración de conversión...', 0);
    
    // Check feature flag first
    if (!PDF_THUMBS_ENABLED) {
      const warningMsg = 'La conversión de PDF a imágenes está deshabilitada por configuración. OCR no estará disponible.';
      console.warn('[pdf-thumbs] disabled by flag; skipping image conversion');
      warnings?.push('Conversión de PDF a imágenes deshabilitada por configuración');
      onProgress?.(warningMsg, 100);
      return [];
    }
    
    onProgress?.('Cargando convertidor PDF...', 10);
    
    // Try to import pdf-to-png-converter, but handle if it's not available
    try {
      // Use computed module name to avoid bundler resolution in environments where it's not installed
      const moduleName = 'pdf-to-png-converter';
      const { pdf } = await import(moduleName as any);
      
      onProgress?.('Preparando archivo para conversión...', 20);
      
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Convert PDF to PNG images
      const conversionOptions = {
        disableFontFace: true, // Disable font face to avoid errors
        useSystemFonts: true,  // Use system fonts
        viewportScale: 2.0,    // Higher resolution for better OCR
      };
      
      console.log('📄 Starting PDF to PNG conversion...');
      onProgress?.('Convirtiendo páginas a imágenes...', 30);
      
      const pngPages = await pdf(buffer, conversionOptions);
      
      console.log(`✅ Converted ${pngPages.length} pages to images`);
      onProgress?.(`Convertidas ${pngPages.length} páginas a imágenes`, 90);
      
      // Return the image buffers
      const imageBuffers = pngPages.map((page: any) => page.content);
      onProgress?.('Conversión completada', 100);
      
      return imageBuffers;
    } catch (importError) {
      const errorMsg = 'El convertidor de PDF a imágenes no está disponible en este entorno. Esto es común en entornos serverless como Vercel.';
      console.warn('⚠️ pdf-to-png-converter not available in this environment');
      console.log('ℹ️ This is expected in serverless environments like Vercel');
      warnings?.push('Convertidor PDF a imágenes no disponible en este entorno');
      onProgress?.(errorMsg, 100);
      
      // Return empty array to indicate conversion failure
      return [];
    }
    
  } catch (error) {
    console.error('❌ PDF to image conversion failed:', error);
    warnings?.push(`Error en conversión PDF a imágenes: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    
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