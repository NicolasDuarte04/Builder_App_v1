import { useCallback } from 'react';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { normalizeCoverageList } from '@/lib/coveragesMap';
import { computeFitScore } from '@/lib/fitScore';
import type { NormalizedPlan } from '@/types/results';
import type { Brief } from '@/types/project';

export function useSourcingToolkit() {
  const normalizePdf = useCallback(async (uploadId: string): Promise<{ plan: NormalizedPlan; fitScore: number }> => {
    const userContext = await getUserContext();
    
    try {
      telemetry.track(telemetry.events.SOURCING_ACTION_CLICKED, { 
        kind: 'pdf', 
        uploadId,
        ...userContext 
      });

      // Call the analyzer API
      const response = await fetch(`/api/ai/analyze-policy?uploadId=${uploadId}`);
      if (!response.ok) {
        throw new Error(`Analyzer API failed: ${response.status}`);
      }

      const analyzerResult = await response.json();

      // Map analyzer result to NormalizedPlan
      const plan: NormalizedPlan = {
        provider: analyzerResult.insurer?.name || analyzerResult.carrier?.name || undefined,
        name: analyzerResult.policyType || analyzerResult.productName || undefined,
        priceCop: analyzerResult.premium?.amount || null,
        benefits: normalizeCoverageList([
          ...(analyzerResult.keyFeatures || []),
          ...(Object.keys(analyzerResult.coverage?.limits || {})),
          ...(analyzerResult.coverage?.benefits || [])
        ]),
        exclusions: normalizeCoverageList(analyzerResult.coverage?.exclusions || []),
        source: { kind: 'pdf', ref: uploadId }
      };

      // Compute fit score if we have a brief in context
      let fitScore = 0;
      const briefFromStorage = localStorage.getItem('currentBrief');
      if (briefFromStorage) {
        try {
          const brief: Brief = JSON.parse(briefFromStorage);
          fitScore = computeFitScore(brief, {
            priceCop: plan.priceCop,
            benefits: plan.benefits
          });
          
          telemetry.track(telemetry.events.FIT_SCORE_COMPUTED, {
            score: fitScore,
            source: 'pdf',
            uploadId,
            ...userContext
          });
        } catch (err) {
          console.warn('Failed to compute fit score:', err);
        }
      }

      telemetry.track(telemetry.events.SOURCE_NORMALIZED_SUCCESS, {
        source: 'pdf',
        uploadId,
        provider: plan.provider,
        benefitsCount: plan.benefits.length,
        exclusionsCount: plan.exclusions?.length || 0,
        fitScore,
        ...userContext
      });

      return { plan, fitScore };

    } catch (error) {
      telemetry.track(telemetry.events.SOURCE_NORMALIZED_FAIL, {
        source: 'pdf',
        uploadId,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...userContext
      });
      throw error;
    }
  }, []);

  const normalizeUrl = useCallback(async (url: string): Promise<{ plan: NormalizedPlan; fitScore: number }> => {
    const userContext = await getUserContext();
    
    try {
      telemetry.track(telemetry.events.SOURCING_ACTION_CLICKED, { 
        kind: 'url', 
        url,
        ...userContext 
      });

      // Call the normalize URL API
      const response = await fetch('/api/normalize-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Normalize URL API failed: ${response.status}`);
      }

      const result = await response.json();

      // Map result to NormalizedPlan
      const plan: NormalizedPlan = {
        provider: result.provider || undefined,
        name: result.name || result.productName || undefined,
        priceCop: result.priceCop || result.price || null,
        benefits: normalizeCoverageList(result.benefits || result.coverages || []),
        exclusions: normalizeCoverageList(result.exclusions || []),
        source: { kind: 'url', ref: url }
      };

      // Compute fit score
      let fitScore = 0;
      const briefFromStorage = localStorage.getItem('currentBrief');
      if (briefFromStorage) {
        try {
          const brief: Brief = JSON.parse(briefFromStorage);
          fitScore = computeFitScore(brief, {
            priceCop: plan.priceCop,
            benefits: plan.benefits
          });
          
          telemetry.track(telemetry.events.FIT_SCORE_COMPUTED, {
            score: fitScore,
            source: 'url',
            url,
            ...userContext
          });
        } catch (err) {
          console.warn('Failed to compute fit score:', err);
        }
      }

      telemetry.track(telemetry.events.SOURCE_NORMALIZED_SUCCESS, {
        source: 'url',
        url,
        provider: plan.provider,
        benefitsCount: plan.benefits.length,
        exclusionsCount: plan.exclusions?.length || 0,
        fitScore,
        ...userContext
      });

      return { plan, fitScore };

    } catch (error) {
      telemetry.track(telemetry.events.SOURCE_NORMALIZED_FAIL, {
        source: 'url',
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...userContext
      });
      throw error;
    }
  }, []);

  const normalizeText = useCallback(async (text: string): Promise<{ plan: NormalizedPlan; fitScore: number }> => {
    const userContext = await getUserContext();
    
    try {
      telemetry.track(telemetry.events.SOURCING_ACTION_CLICKED, { 
        kind: 'text', 
        textLength: text.length,
        ...userContext 
      });

      // Local text parsing - extract key information using simple heuristics
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      
      // Extract provider (look for common insurance company patterns)
      const providerPatterns = [
        /(?:aseguradora|seguros|insurance)\s+([A-Za-zÀ-ÿ\s]+)/i,
        /^([A-Za-zÀ-ÿ\s]+)\s+(?:seguros|insurance)/i
      ];
      
      let provider: string | undefined;
      for (const line of lines) {
        for (const pattern of providerPatterns) {
          const match = line.match(pattern);
          if (match) {
            provider = match[1].trim();
            break;
          }
        }
        if (provider) break;
      }

      // Extract price (look for COP amounts)
      const pricePatterns = [
        /(?:\$|COP|pesos?)\s*([\d,\.]+)/i,
        /([\d,\.]+)\s*(?:COP|pesos?)/i,
        /prima[:\s]*([\d,\.]+)/i
      ];
      
      let priceCop: number | null = null;
      for (const line of lines) {
        for (const pattern of pricePatterns) {
          const match = line.match(pattern);
          if (match) {
            const priceStr = match[1].replace(/[,\.]/g, '');
            const price = parseInt(priceStr, 10);
            if (!isNaN(price) && price > 0) {
              priceCop = price;
              break;
            }
          }
        }
        if (priceCop) break;
      }

      // Extract benefits and exclusions (look for common patterns)
      const benefitKeywords = [
        'cobertura', 'incluye', 'beneficio', 'protección', 'ampara',
        'responsabilidad civil', 'daños materiales', 'lesiones', 'robo',
        'asistencia', 'grúa', 'vidrios', 'incendio'
      ];
      
      const exclusionKeywords = [
        'excluye', 'no cubre', 'exclusión', 'limitación',
        'guerra', 'actos terroristas', 'uso comercial', 'embriaguez'
      ];

      const benefits: string[] = [];
      const exclusions: string[] = [];

      for (const line of lines.map(l => l.toLowerCase())) {
        for (const keyword of benefitKeywords) {
          if (line.includes(keyword)) {
            benefits.push(keyword);
          }
        }
        for (const keyword of exclusionKeywords) {
          if (line.includes(keyword)) {
            exclusions.push(keyword);
          }
        }
      }

      const plan: NormalizedPlan = {
        provider,
        name: undefined, // Hard to extract reliably from text
        priceCop,
        benefits: normalizeCoverageList([...new Set(benefits)]), // Remove duplicates
        exclusions: normalizeCoverageList([...new Set(exclusions)]),
        source: { kind: 'text', ref: text.substring(0, 100) + (text.length > 100 ? '...' : '') }
      };

      // Compute fit score
      let fitScore = 0;
      const briefFromStorage = localStorage.getItem('currentBrief');
      if (briefFromStorage) {
        try {
          const brief: Brief = JSON.parse(briefFromStorage);
          fitScore = computeFitScore(brief, {
            priceCop: plan.priceCop,
            benefits: plan.benefits
          });
          
          telemetry.track(telemetry.events.FIT_SCORE_COMPUTED, {
            score: fitScore,
            source: 'text',
            textLength: text.length,
            ...userContext
          });
        } catch (err) {
          console.warn('Failed to compute fit score:', err);
        }
      }

      telemetry.track(telemetry.events.SOURCE_NORMALIZED_SUCCESS, {
        source: 'text',
        textLength: text.length,
        provider: plan.provider,
        benefitsCount: plan.benefits.length,
        exclusionsCount: plan.exclusions?.length || 0,
        fitScore,
        ...userContext
      });

      return { plan, fitScore };

    } catch (error) {
      telemetry.track(telemetry.events.SOURCE_NORMALIZED_FAIL, {
        source: 'text',
        textLength: text.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...userContext
      });
      throw error;
    }
  }, []);

  return {
    normalizePdf,
    normalizeUrl,
    normalizeText
  };
}
