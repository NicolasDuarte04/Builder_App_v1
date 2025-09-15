import { describe, it, expect } from 'vitest';
import { PDFAnalysisError, getErrorMessage } from '../../src/lib/pdf-analyzer-enhanced';

describe('OCR error mapping → localized messages', () => {
  it('maps NO_TEXT_EXTRACTED', () => {
    const err = new PDFAnalysisError('no text', 'NO_TEXT_EXTRACTED');
    const msg = getErrorMessage(err);
    expect(msg).toMatch(/No se pudo extraer texto del PDF/i);
  });

  it('maps OCR_FAILED', () => {
    const err = new PDFAnalysisError('ocr failed', 'OCR_FAILED');
    const msg = getErrorMessage(err);
    expect(msg).toMatch(/OCR/i);
  });

  it('maps DEPENDENCY_MISSING', () => {
    const err = new PDFAnalysisError('missing deps', 'DEPENDENCY_MISSING');
    const msg = getErrorMessage(err);
    expect(msg).toMatch(/herramientas de procesamiento avanzado no están disponibles/i);
  });
});


