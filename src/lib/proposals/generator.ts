import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import type { Brief } from '@/types/brief';
import type { ComparedPlan } from '@/types/compare';
import { FLAGS } from '@/lib/flags';
import { formatTrustDate } from '@/lib/utils';
import { validateAndNormalizeBrief } from '@/lib/validate/brief';
import { normalizeCoverageList } from '@/lib/coveragesMap';
import { formatCurrency } from '@/lib/utils';

export interface ProposalInput {
  brief: Partial<Brief>;
  comparedItems: ComparedPlan[];
  notes?: string;
  sources?: { title: string; url?: string; date?: string }[];
  branding?: {
    brokerName?: string;
    logoUrl?: string;
  };
  locale?: 'es' | 'en';
}

export interface ProposalOutput {
  buffer: Buffer;
  size: number;
  pages: number;
}

const TRANSLATIONS = {
  es: {
    coverTitle: 'Propuesta de Seguros',
    preparedFor: 'Preparado para',
    date: 'Fecha',
    briefSummary: 'Resumen del Brief',
    category: 'Categoría',
    maxBudget: 'Presupuesto máximo',
    mustHaveCoverages: 'Coberturas requeridas',
    exclusions: 'Exclusiones',
    comparison: 'Comparación de Planes',
    provider: 'Proveedor',
    plan: 'Plan',
    price: 'Precio',
    coverages: 'Coberturas',
    deductible: 'Deducible',
    waitingTimes: 'Tiempos de espera',
    fitScore: 'Score de ajuste',
    estimated: '(est.)',
    criticalDifferences: 'Diferencias Críticas',
    whyTheseOptions: 'Por qué estas opciones',
    disclaimers: 'Aviso Legal',
    disclaimerText: 'Esta propuesta incluye información de múltiples fuentes que pueden no estar completamente actualizadas. Verifique los detalles directamente con las aseguradoras antes de tomar una decisión.',
    sources: 'Fuentes',
    lastUpdated: 'Última actualización',
    noDate: 'Sin fecha',
    page: 'Página',
    of: 'de',
  },
  en: {
    coverTitle: 'Insurance Proposal',
    preparedFor: 'Prepared for',
    date: 'Date',
    briefSummary: 'Brief Summary',
    category: 'Category',
    maxBudget: 'Maximum budget',
    mustHaveCoverages: 'Required coverages',
    exclusions: 'Exclusions',
    comparison: 'Plan Comparison',
    provider: 'Provider',
    plan: 'Plan',
    price: 'Price',
    coverages: 'Coverages',
    deductible: 'Deductible',
    waitingTimes: 'Waiting times',
    fitScore: 'Fit score',
    estimated: '(est.)',
    criticalDifferences: 'Critical Differences',
    whyTheseOptions: 'Why these options',
    disclaimers: 'Legal Notice',
    disclaimerText: 'This proposal includes information from multiple sources that may not be fully up to date. Please verify details directly with insurers before making a decision.',
    sources: 'Sources',
    lastUpdated: 'Last updated',
    noDate: 'No date',
    page: 'Page',
    of: 'of',
  },
};

async function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: {
    size?: number;
    color?: { r: number; g: number; b: number };
    font?: any;
    maxWidth?: number;
  } = {}
) {
  const { size = 12, color = { r: 0, g: 0, b: 0 }, font, maxWidth } = options;
  
  if (maxWidth) {
    const words = text.split(' ');
    let line = '';
    let lineY = y;
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const width = font.widthOfTextAtSize(testLine, size);
      
      if (width > maxWidth && line) {
        page.drawText(line, {
          x,
          y: lineY,
          size,
          font,
          color: rgb(color.r, color.g, color.b),
        });
        line = word;
        lineY -= size + 4;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      page.drawText(line, {
        x,
        y: lineY,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
      });
    }
    
    return lineY - size;
  } else {
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
    });
    return y - size;
  }
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatCOP(value: number | null | undefined, locale: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
  
  return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export async function generateProposal(input: ProposalInput): Promise<ProposalOutput> {
  const { brief, comparedItems, notes, sources, branding, locale = 'es' } = input;
  const t = TRANSLATIONS[locale];

  // Normalize brief
  const { brief: normalizedBrief } = validateAndNormalizeBrief(brief);

  // Normalize compared items
  const normalizedItems = comparedItems.slice(0, 3).map(item => ({
    ...item,
    coverages: normalizeCoverageList(item.coverages),
  }));

  // Create PDF
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let pageCount = 0;

  // Page 1: Cover
  const coverPage = pdfDoc.addPage();
  pageCount++;
  const { width, height } = coverPage.getSize();
  
  let y = height - 100;

  // Logo/Branding
  if (branding?.brokerName) {
    await drawText(coverPage, branding.brokerName, 50, y, {
      size: 24,
      font: helveticaBoldFont,
    });
    y -= 60;
  }

  // Title
  await drawText(coverPage, t.coverTitle, width / 2 - 100, y, {
    size: 32,
    font: helveticaBoldFont,
  });
  y -= 80;

  // Prepared for
  if (normalizedBrief.clientPersona) {
    await drawText(coverPage, t.preparedFor + ':', 50, y, {
      size: 14,
      font: helveticaFont,
    });
    y -= 20;
    await drawText(coverPage, normalizedBrief.clientPersona, 50, y, {
      size: 16,
      font: helveticaBoldFont,
    });
    y -= 40;
  }

  // Date
  await drawText(coverPage, t.date + ': ' + formatDate(new Date(), locale), 50, y, {
    size: 14,
    font: helveticaFont,
  });

  // Page 2: Brief Summary
  const briefPage = pdfDoc.addPage();
  pageCount++;
  y = height - 80;

  await drawText(briefPage, t.briefSummary, 50, y, {
    size: 24,
    font: helveticaBoldFont,
  });
  y -= 40;

  // Category
  if (normalizedBrief.category) {
    await drawText(briefPage, t.category + ': ' + normalizedBrief.category, 50, y, {
      size: 14,
      font: helveticaFont,
    });
    y -= 25;
  }

  // Budget
  if (normalizedBrief.maxBudgetCop) {
    await drawText(
      briefPage,
      t.maxBudget + ': ' + formatCOP(normalizedBrief.maxBudgetCop, locale),
      50,
      y,
      {
        size: 14,
        font: helveticaFont,
      }
    );
    y -= 25;
  }

  // Must have coverages
  if (normalizedBrief.mustHaveCoverages?.length) {
    await drawText(briefPage, t.mustHaveCoverages + ':', 50, y, {
      size: 14,
      font: helveticaBoldFont,
    });
    y -= 20;
    
    for (const coverage of normalizedBrief.mustHaveCoverages) {
      await drawText(briefPage, '• ' + coverage, 70, y, {
        size: 12,
        font: helveticaFont,
      });
      y -= 20;
    }
    y -= 10;
  }

  // Exclusions
  if (normalizedBrief.exclusions?.length) {
    await drawText(briefPage, t.exclusions + ':', 50, y, {
      size: 14,
      font: helveticaBoldFont,
    });
    y -= 20;
    
    for (const exclusion of normalizedBrief.exclusions) {
      await drawText(briefPage, '• ' + exclusion, 70, y, {
        size: 12,
        font: helveticaFont,
      });
      y -= 20;
    }
  }

  // Page 3: Comparison Table
  const comparisonPage = pdfDoc.addPage();
  pageCount++;
  y = height - 80;

  await drawText(comparisonPage, t.comparison, 50, y, {
    size: 24,
    font: helveticaBoldFont,
  });
  y -= 40;

  // Table headers
  const colX = [50, 200, 350, 450];
  const headers = [t.plan, t.price, t.coverages, t.fitScore];
  
  for (let i = 0; i < headers.length; i++) {
    await drawText(comparisonPage, headers[i], colX[i], y, {
      size: 12,
      font: helveticaBoldFont,
    });
  }
  y -= 30;

  // Table rows
  for (const item of normalizedItems) {
    // Provider/Plan name
    const planName = item.name || item.id;
    const provider = item.provider || '';
    await drawText(comparisonPage, provider, colX[0], y, {
      size: 11,
      font: helveticaBoldFont,
      maxWidth: 140,
    });
    y -= 15;
    await drawText(comparisonPage, planName, colX[0], y, {
      size: 10,
      font: helveticaFont,
      maxWidth: 140,
    });
    // Trust metadata under plan name (small gray), gated by flag
    if (FLAGS.trustMetadata) {
      const kind = item.source?.kind;
      const updatedAt = item.source?.updatedAt || item.updatedAt;
      const dateText = formatTrustDate(updatedAt, locale === 'es' ? 'es-CO' : 'en-US');
      if (kind && dateText) {
        y -= 12;
        await drawText(comparisonPage, `${t.source || 'Fuente'}: ${kind} • ${t.lastUpdated || 'Última actualización'}: ${dateText}`, colX[0], y, {
          size: 8,
          font: helveticaFont,
          color: { r: 0.45, g: 0.45, b: 0.45 },
          maxWidth: 180,
        });
        y += 12; // restore for rest of row spacing
      }
    }
    
    // Price
    const priceText = item.priceCop
      ? formatCOP(item.priceCop, locale)
      : item.priceEstCop
      ? formatCOP(item.priceEstCop, locale) + ' ' + t.estimated
      : '—';
    await drawText(comparisonPage, priceText, colX[1], y, {
      size: 11,
      font: helveticaFont,
      maxWidth: 140,
    });
    
    // Coverages (first 3)
    const coverageText = item.coverages.slice(0, 3).join(', ') + 
      (item.coverages.length > 3 ? '...' : '');
    await drawText(comparisonPage, coverageText, colX[2], y, {
      size: 10,
      font: helveticaFont,
      maxWidth: 90,
    });
    
    // Fit score
    const scoreText = item.fitScore ? item.fitScore + '%' : '—';
    await drawText(comparisonPage, scoreText, colX[3], y, {
      size: 11,
      font: helveticaFont,
    });
    
    y -= 40;
  }

  // Page 4: Critical Differences & Why These Options
  const analysisPage = pdfDoc.addPage();
  pageCount++;
  y = height - 80;

  // Critical Differences
  await drawText(analysisPage, t.criticalDifferences, 50, y, {
    size: 20,
    font: helveticaBoldFont,
  });
  y -= 30;

  const differences = [
    locale === 'es' 
      ? 'Cobertura de vidrios varía significativamente entre planes'
      : 'Glass coverage varies significantly between plans',
    locale === 'es'
      ? 'Tiempos de espera para maternidad: 10-12 meses'
      : 'Maternity waiting times: 10-12 months',
    locale === 'es'
      ? 'Deducibles anuales desde $500.000 hasta $2.000.000'
      : 'Annual deductibles from $500,000 to $2,000,000',
  ];

  for (const diff of differences) {
    await drawText(analysisPage, '• ' + diff, 70, y, {
      size: 12,
      font: helveticaFont,
      maxWidth: width - 140,
    });
    y -= 30;
  }

  y -= 20;

  // Why These Options
  await drawText(analysisPage, t.whyTheseOptions, 50, y, {
    size: 20,
    font: helveticaBoldFont,
  });
  y -= 30;

  const whyText = locale === 'es'
    ? 'Estos planes han sido seleccionados basándose en su alineación con las coberturas requeridas, presupuesto disponible y reputación del proveedor en el mercado. Cada opción ofrece un balance único entre precio y beneficios que se ajusta a diferentes necesidades.'
    : 'These plans have been selected based on their alignment with required coverages, available budget, and provider reputation in the market. Each option offers a unique balance between price and benefits that fits different needs.';

  y = await drawText(analysisPage, whyText, 50, y, {
    size: 12,
    font: helveticaFont,
    maxWidth: width - 100,
  });

  // Page 5: Disclaimers & Sources (if needed)
  const hasNonCatalogSources = normalizedItems.some(item => item.source.kind !== 'catalog');
  
  if (hasNonCatalogSources || sources?.length) {
    const disclaimerPage = pdfDoc.addPage();
    pageCount++;
    y = height - 80;

    // Disclaimers
    if (hasNonCatalogSources) {
      await drawText(disclaimerPage, t.disclaimers, 50, y, {
        size: 20,
        font: helveticaBoldFont,
      });
      y -= 30;

      y = await drawText(disclaimerPage, t.disclaimerText, 50, y, {
        size: 11,
        font: helveticaFont,
        maxWidth: width - 100,
      });
      y -= 40;
    }

    // Sources
    if (sources?.length) {
      await drawText(disclaimerPage, t.sources, 50, y, {
        size: 20,
        font: helveticaBoldFont,
      });
      y -= 30;

      for (const source of sources) {
        await drawText(disclaimerPage, '• ' + source.title, 70, y, {
          size: 12,
          font: helveticaBoldFont,
        });
        y -= 20;
        
        if (source.url) {
          await drawText(disclaimerPage, source.url, 90, y, {
            size: 10,
            font: helveticaFont,
            color: { r: 0, g: 0, b: 0.8 },
          });
          y -= 15;
        }
        
        if (source.date) {
          await drawText(disclaimerPage, t.lastUpdated + ': ' + source.date, 90, y, {
            size: 10,
            font: helveticaFont,
          });
          y -= 25;
        } else {
          y -= 10;
        }
      }
    }
  }

  // Add page numbers
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    await drawText(
      page,
      `${t.page} ${i + 1} ${t.of} ${pages.length}`,
      width / 2 - 30,
      30,
      {
        size: 10,
        font: helveticaFont,
        color: { r: 0.5, g: 0.5, b: 0.5 },
      }
    );
  }

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  
  return {
    buffer: Buffer.from(pdfBytes),
    size: pdfBytes.length,
    pages: pageCount,
  };
}

// Compatibility alias for the generateProposal function
export const generateProposalPDF = generateProposal;
