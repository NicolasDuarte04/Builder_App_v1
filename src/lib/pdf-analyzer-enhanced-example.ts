/**
 * Ejemplo de uso del PDF Analyzer Enhanced mejorado
 * Este archivo muestra cómo usar las nuevas funcionalidades implementadas
 */

import { 
  extractTextFromPDFWithOCR, 
  extractTextFromPDFOCROnly,
  isOCRAvailable,
  getErrorMessage,
  PDFAnalysisError,
  ProgressCallback,
  ExtractionResult
} from './pdf-analyzer-enhanced';

/**
 * Ejemplo de uso básico con callback de progreso
 */
export async function analyzePDFWithProgress(file: File): Promise<ExtractionResult> {
  const onProgress: ProgressCallback = (message: string, progress?: number) => {
    console.log(`[${progress || 0}%] ${message}`);
    // Aquí podrías actualizar la UI con el progreso
    // updateProgressBar(progress || 0);
    // updateStatusMessage(message);
  };

  try {
    const result = await extractTextFromPDFWithOCR(file, { onProgress });
    
    console.log('✅ Análisis completado:', {
      method: result.method,
      textLength: result.text.length,
      processingTime: result.processingTime,
      pageCount: result.pageCount,
      warnings: result.warnings
    });

    return result;
  } catch (error) {
    if (error instanceof PDFAnalysisError) {
      const userMessage = getErrorMessage(error);
      console.error('❌ Error específico:', userMessage);
      console.error('Detalles técnicos:', error.details);
    } else {
      console.error('❌ Error inesperado:', error);
    }
    throw error;
  }
}

/**
 * Ejemplo de uso con OCR forzado
 */
export async function forceOCRAnalysis(file: File): Promise<ExtractionResult> {
  const onProgress: ProgressCallback = (message: string, progress?: number) => {
    console.log(`[OCR Forzado - ${progress || 0}%] ${message}`);
  };

  try {
    const result = await extractTextFromPDFWithOCR(file, { 
      onProgress, 
      forceOCR: true 
    });
    
    console.log('✅ OCR forzado completado:', {
      method: result.method,
      textLength: result.text.length,
      processingTime: result.processingTime,
      pageCount: result.pageCount,
      warnings: result.warnings
    });

    return result;
  } catch (error) {
    if (error instanceof PDFAnalysisError) {
      const userMessage = getErrorMessage(error);
      console.error('❌ Error en OCR forzado:', userMessage);
    }
    throw error;
  }
}

/**
 * Ejemplo de verificación de disponibilidad de OCR
 */
export async function checkOCRSupport(): Promise<void> {
  const isAvailable = await isOCRAvailable();
  
  if (isAvailable) {
    console.log('✅ OCR está disponible en este entorno');
  } else {
    console.log('⚠️ OCR no está disponible en este entorno');
    console.log('Esto es común en entornos serverless como Vercel');
  }
}

/**
 * Ejemplo de manejo de errores específicos
 */
export async function handlePDFAnalysis(file: File): Promise<void> {
  try {
    await analyzePDFWithProgress(file);
  } catch (error) {
    if (error instanceof PDFAnalysisError) {
      switch (error.code) {
        case 'FILE_TOO_LARGE':
          console.log('💡 Sugerencia: Comprime el PDF o usa un archivo más pequeño');
          break;
        case 'INVALID_FILE':
          console.log('💡 Sugerencia: Verifica que el archivo sea un PDF válido');
          break;
        case 'NO_TEXT_EXTRACTED':
          console.log('💡 Sugerencia: El PDF puede estar protegido o contener solo imágenes');
          break;
        case 'OCR_FAILED':
          console.log('💡 Sugerencia: Intenta con un PDF de mejor calidad o usa OCR forzado');
          break;
        case 'DEPENDENCY_MISSING':
          console.log('💡 Sugerencia: Usa un PDF con texto seleccionable en lugar de imágenes');
          break;
        default:
          console.log('💡 Sugerencia: Intenta nuevamente o contacta soporte');
      }
    }
  }
}

/**
 * Ejemplo de uso en un componente React
 */
export function usePDFAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzePDF = async (file: File) => {
    setIsAnalyzing(true);
    setProgress(0);
    setStatusMessage('');
    setResult(null);
    setError(null);

    const onProgress: ProgressCallback = (message: string, progress?: number) => {
      setStatusMessage(message);
      setProgress(progress || 0);
    };

    try {
      const analysisResult = await extractTextFromPDFWithOCR(file, { onProgress });
      setResult(analysisResult);
    } catch (err) {
      if (err instanceof PDFAnalysisError) {
        setError(getErrorMessage(err));
      } else {
        setError('Error inesperado durante el análisis');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzePDF,
    isAnalyzing,
    progress,
    statusMessage,
    result,
    error
  };
}

// Import necesario para el ejemplo de React
import { useState } from 'react';
