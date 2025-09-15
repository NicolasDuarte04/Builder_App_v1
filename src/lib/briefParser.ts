import OpenAI from 'openai';
import { Brief } from '@/types/brief';
import { parseLatinNumber } from './money';
import { telemetry, getUserContext } from './telemetry';
import { backoff } from './net/backoff';
import { COVERAGE_PRESETS } from './coverage-presets';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Token limit for input text
const TOKEN_LIMIT = 6000;

// Category synonyms mapping to canonical Brief categories
const CATEGORY_SYNONYMS: Record<string, Brief['category']> = {
  // Vehículos
  'auto': 'Vehículos',
  'carro': 'Vehículos',
  'vehiculo': 'Vehículos',
  'vehículo': 'Vehículos',
  'moto': 'Vehículos',
  'motocicleta': 'Vehículos',
  'soat': 'Vehículos',
  'car': 'Vehículos',
  'vehicle': 'Vehículos',
  'motorcycle': 'Vehículos',
  
  // Salud
  'salud': 'Salud',
  'medico': 'Salud',
  'médico': 'Salud',
  'medicina': 'Salud',
  'eps': 'Salud',
  'prepagada': 'Salud',
  'health': 'Salud',
  'medical': 'Salud',
  'healthcare': 'Salud',
  
  // Hogar
  'hogar': 'Hogar',
  'casa': 'Hogar',
  'vivienda': 'Hogar',
  'apartamento': 'Hogar',
  'inmueble': 'Hogar',
  'home': 'Hogar',
  'house': 'Hogar',
  'property': 'Hogar',
  
  // Viajes
  'viaje': 'Viajes',
  'viajes': 'Viajes',
  'turismo': 'Viajes',
  'vacaciones': 'Viajes',
  'travel': 'Viajes',
  'trip': 'Viajes',
  'vacation': 'Viajes',
  
  // Vida
  'vida': 'Vida',
  'fallecimiento': 'Vida',
  'muerte': 'Vida',
  'invalidez': 'Vida',
  'life': 'Vida',
  'death': 'Vida',
  
  // Default to "Otro" for unrecognized
  'empresarial': 'Otro',
  'empresa': 'Otro',
  'negocio': 'Otro',
  'comercial': 'Otro',
  'mascotas': 'Otro',
  'pets': 'Otro',
  'educacion': 'Otro',
  'educativa': 'Otro',
  'education': 'Otro',
};

// Coverage synonyms for normalization
const COVERAGE_SYNONYMS: Record<string, string> = {
  // Common Spanish variations
  'rc': 'responsabilidad civil',
  'responsabilidad civil': 'responsabilidad civil',
  'vidrios': 'vidrios',
  'cristales': 'vidrios',
  'robo': 'robo',
  'hurto': 'robo',
  'incendio': 'incendio',
  'fuego': 'incendio',
  'daños propios': 'daños propios',
  'todo riesgo': 'daños propios',
  'asistencia': 'asistencia',
  'grua': 'asistencia',
  'remolque': 'asistencia',
  
  // Health coverages
  'consultas': 'consultas',
  'hospitalizacion': 'hospitalización',
  'hospitalización': 'hospitalización',
  'medicamentos': 'medicamentos',
  'farmacos': 'medicamentos',
  'maternidad': 'maternidad',
  'odontologia': 'odontología',
  'odontología': 'odontología',
  'dental': 'odontología',
  'preexistencias': 'preexistencias',
  
  // Travel coverages
  'asistencia medica': 'asistencia médica',
  'asistencia médica': 'asistencia médica',
  'evacuacion': 'evacuación',
  'evacuación': 'evacuación',
  'equipaje': 'equipaje',
  'maletas': 'equipaje',
  'cancelacion': 'cancelación',
  'cancelación': 'cancelación',
  'repatriacion': 'repatriación',
  'repatriación': 'repatriación',
  'demoras': 'demoras',
  
  // Home coverages
  'inundacion': 'inundación',
  'inundación': 'inundación',
  'terremoto': 'terremoto',
  'sismo': 'terremoto',
  
  // Life coverages
  'muerte': 'muerte',
  'invalidez': 'invalidez',
  'enfermedades graves': 'enfermedades graves',
  'renta diaria': 'renta diaria',
  'auxilio funerario': 'auxilio funerario',
};

/**
 * Approximate token count for text (rough estimate: 1 token ≈ 4 characters)
 */
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Sanitize input text by removing control characters and zero-width characters
 */
function sanitizeText(text: string): string {
  return text
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove unbalanced braces (simple approach)
    .replace(/[{}]/g, '')
    .trim();
}

/**
 * Extract budget from Spanish/LatAm text formats
 */
function extractBudget(text: string): number | null {
  const sanitized = sanitizeText(text.toLowerCase());
  
  // Pattern for various budget formats with explicit multiplier handling
  const patterns = [
    // Specific patterns with multipliers first
    /([0-9.,\s]+)\s*millones?\b/gi,
    /([0-9.,\s]+)\s*mil\b(?!\s*millones)/gi,
    /([0-9.,\s]+)\s*k\b/gi,
    /([0-9.,\s]+)\s*m\b(?!\s*il)/gi,
    // Currency prefixed amounts
    /(?:cop|col\$|\$)\s*([0-9.,\s]+)/gi,
    // Presupuesto/budget followed by amount with optional multipliers
    /(?:presupuesto|budget|máximo|hasta|up\s+to)\s*:?\s*(?:cop|col\$|\$)?\s*([0-9.,\s]+)(?:\s*(millones?|mil|k|m))?\b/gi,
    // Plain numbers that could be budgets (6+ digits)
    /\b([0-9.,\s]{6,})\b/g,
  ];
  
  let maxBudget = 0;
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    let match;
    while ((match = pattern.exec(sanitized)) !== null) {
      const rawAmount = match[1];
      let amount = parseLatinNumber(rawAmount);
      
      if (!amount || amount <= 0) continue;
      
      // Handle multipliers based on pattern or capture group
      const fullMatch = match[0].toLowerCase();
      const multiplier = match[2]?.toLowerCase() || '';
      
      // Apply multipliers unconditionally on the parsed float
      if (i === 0 || fullMatch.includes('millones') || multiplier.includes('millones') || fullMatch.includes('millón') || multiplier.includes('millón')) {
        amount = amount * 1_000_000;
      } else if (i === 1 || fullMatch.includes('mil') || multiplier.includes('mil')) {
        amount = amount * 1_000;
      } else if (i === 2 || fullMatch.includes('k') || multiplier.includes('k')) {
        amount = amount * 1_000;
      } else if (i === 3 || (fullMatch.includes('m') && !fullMatch.includes('mil')) || multiplier === 'm') {
        amount = amount * 1_000_000;
      }

      // Round down to integer COP
      amount = Math.floor(amount);
      
      if (amount >= 10000 && amount <= 1000000000 && amount > maxBudget) {
        maxBudget = amount;
      }
    }
  }
  
  return maxBudget > 0 ? maxBudget : null;
}

/**
 * Extract category from text using synonyms
 */
function extractCategory(text: string): Brief['category'] | null {
  const sanitized = sanitizeText(text.toLowerCase());
  
  // Check for category keywords
  for (const [synonym, category] of Object.entries(CATEGORY_SYNONYMS)) {
    if (sanitized.includes(synonym)) {
      return category;
    }
  }
  
  return null;
}

/**
 * Extract must-have coverages from text
 */
function extractCoverages(text: string, category?: Brief['category']): string[] {
  const sanitized = sanitizeText(text.toLowerCase());
  const foundCoverages = new Set<string>();
  
  // Check against coverage synonyms
  for (const [synonym, canonical] of Object.entries(COVERAGE_SYNONYMS)) {
    if (sanitized.includes(synonym)) {
      foundCoverages.add(canonical);
    }
  }
  
  // If we have a category, also check against its presets
  if (category) {
    const categoryKey = category.toLowerCase();
    let presetKey: keyof typeof COVERAGE_PRESETS = 'vehiculos'; // default
    
    if (categoryKey === 'vehículos') presetKey = 'vehiculos';
    else if (categoryKey === 'salud') presetKey = 'salud';
    else if (categoryKey === 'hogar') presetKey = 'hogar';
    else if (categoryKey === 'viajes') presetKey = 'viajes';
    else if (categoryKey === 'vida') presetKey = 'vida';
    else if (categoryKey === 'otro') presetKey = 'pyme'; // fallback
    
    const presets = COVERAGE_PRESETS[presetKey] || [];
    
    for (const preset of presets) {
      if (sanitized.includes(preset.toLowerCase())) {
        foundCoverages.add(preset);
      }
    }
  }
  
  return Array.from(foundCoverages);
}

/**
 * Extract persona information from text
 */
function extractPersona(text: string): string | undefined {
  const sanitized = sanitizeText(text);
  
  // Look for persona indicators
  const personaPatterns = [
    /(?:soy|tengo|edad|años|año)\s+([^.]+)/gi,
    /(?:familia|esposa?|esposo|hijos?|niños?)\s+([^.]+)/gi,
    /(?:trabajo|profesion|ocupacion)\s+([^.]+)/gi,
  ];
  
  const personas = [];
  for (const pattern of personaPatterns) {
    let match;
    while ((match = pattern.exec(sanitized)) !== null) {
      const info = match[1].trim();
      if (info.length > 3 && info.length < 100) {
        personas.push(info);
      }
    }
  }
  
  return personas.length > 0 ? personas.join('; ') : undefined;
}

/**
 * Parse brief from text using heuristics first, then LLM fallback
 */
export async function parseBriefFromText(
  text: string, 
  locale: string = 'es'
): Promise<Partial<Brief> | { error: string }> {
  try {
    const { sessionId, userId } = await getUserContext();
    
    // Sanitize and validate input
    const sanitizedText = sanitizeText(text);
    if (!sanitizedText || sanitizedText.length < 10) {
      return { error: 'schema_mismatch' };
    }
    
    // Check token limit and truncate if needed
    let processedText = sanitizedText;
    const tokens = approxTokens(sanitizedText);
    if (tokens > TOKEN_LIMIT) {
      processedText = sanitizedText.substring(0, TOKEN_LIMIT * 4) + '...';
      console.warn(`[briefParser] Text truncated from ${tokens} to ~${TOKEN_LIMIT} tokens`);
    }
    
    // Try heuristics first
    const budget = extractBudget(processedText);
    const category = extractCategory(processedText);
    const coverages = extractCoverages(processedText, category);
    const persona = extractPersona(processedText);
    
    const heuristicResult: Partial<Brief> = {};
    const fieldsFound: string[] = [];
    
    if (budget) {
      heuristicResult.maxBudgetCop = budget;
      fieldsFound.push('maxBudgetCop');
    }
    if (category) {
      heuristicResult.category = category;
      fieldsFound.push('category');
    }
    if (coverages.length > 0) {
      heuristicResult.mustHaveCoverages = coverages;
      fieldsFound.push('mustHaveCoverages');
    }
    if (persona) {
      heuristicResult.clientPersona = persona;
      fieldsFound.push('clientPersona');
    }
    
    // Track heuristics hit
    if (fieldsFound.length > 0) {
      telemetry.track(telemetry.events.PARSER_HEURISTICS_HIT, {
        fields: fieldsFound,
        sessionId,
        userId
      });
    }
    
    // If heuristics found substantial info, return it
    if (fieldsFound.length >= 2 || (budget && category)) {
      telemetry.track(telemetry.events.BRIEF_PARSED_SUCCESS, {
        fieldsFilled: fieldsFound,
        latencyMs: 0, // Heuristics are instant
        sessionId,
        userId
      });
      
      return {
        ...heuristicResult,
        notes: processedText !== sanitizedText ? 'Texto truncado para procesamiento' : undefined,
        rawText: processedText,
      };
    }
    
    // If input exceeded token limit, do not call LLM. Return token_limit error.
    if (tokens > TOKEN_LIMIT) {
      telemetry.track(telemetry.events.PARSER_OUTPUT_SCHEMA_MISMATCH, {
        reason: 'token_limit',
        sessionId,
        userId
      });
      return { error: 'token_limit' };
    }
    
    // Fall back to LLM
    return await parseBriefWithLLM(processedText, locale, heuristicResult);
    
  } catch (error) {
    console.error('[briefParser] Error parsing text:', error);
    return { error: 'schema_mismatch' };
  }
}

/**
 * Parse brief from PDF using fileId (uploadId from policy_uploads table)
 */
export async function parseBriefFromPdf(
  fileId: string
): Promise<Partial<Brief> | { error: string }> {
  try {
    const { sessionId, userId } = await getUserContext();
    
    // This function should only be called server-side
    if (typeof window !== 'undefined') {
      console.error('[briefParser] parseBriefFromPdf called on client side');
      return { error: 'schema_mismatch' };
    }
    
    // Import server-side dependencies
    const { createServerSupabaseClient } = await import('./supabase-server');
    const { extractTextFromPDFWithOCR } = await import('./pdf-analyzer-enhanced');
    
    const serverSupabase = createServerSupabaseClient();
    const POLICY_BUCKET = 'policy-documents';
    
    // Get the upload record to find storage path
    const { data: uploadRecord, error: dbError } = await serverSupabase
      .from('policy_uploads')
      .select('storage_path, file_name, user_id')
      .eq('id', fileId)
      .single();
    
    if (dbError || !uploadRecord) {
      console.error('[briefParser] Failed to find upload record:', dbError);
      return { error: 'schema_mismatch' };
    }
    
    if (!uploadRecord.storage_path) {
      console.error('[briefParser] Upload record has no storage_path');
      return { error: 'schema_mismatch' };
    }
    
    // Download the PDF file from storage
    const { data: fileData, error: downloadError } = await serverSupabase.storage
      .from(POLICY_BUCKET)
      .download(uploadRecord.storage_path);
    
    if (downloadError || !fileData) {
      console.error('[briefParser] Failed to download PDF from storage:', downloadError);
      return { error: 'schema_mismatch' };
    }
    
    // Convert Blob to File for text extraction
    const file = new File([fileData], uploadRecord.file_name || 'policy.pdf', {
      type: 'application/pdf'
    });
    
    // Extract text from PDF
    const { text } = await extractTextFromPDFWithOCR(file);
    
    if (!text || text.length < 10) {
      console.warn('[briefParser] PDF text extraction returned minimal content');
      return { error: 'schema_mismatch' };
    }
    
    // Parse the extracted text using our text parser
    const result = await parseBriefFromText(text, 'es');
    
    // Add PDF reference to the result
    if (result && !('error' in result)) {
      result.docRefs = [
        {
          type: 'pdf',
          ref: fileId,
          title: uploadRecord.file_name || 'Documento PDF',
          extractedAt: new Date().toISOString()
        }
      ];
    }
    
    return result;
    
  } catch (error) {
    console.error('[briefParser] Error parsing PDF:', error);
    return { error: 'schema_mismatch' };
  }
}

/**
 * Parse brief using LLM with structured output
 */
async function parseBriefWithLLM(
  text: string,
  locale: string,
  heuristicResult: Partial<Brief>
): Promise<Partial<Brief> | { error: string }> {
  try {
    const { sessionId, userId } = await getUserContext();
    const startTime = Date.now();
    
    // Track LLM call
    telemetry.track(telemetry.events.PARSER_LLM_CALLED, {
      tokensIn: approxTokens(text),
      sessionId,
      userId
    });
    
    const schema = {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["Vehículos", "Salud", "Viajes", "Vida", "Hogar", "Otro"],
          description: "Insurance category based on the text"
        },
        maxBudgetCop: {
          type: "integer",
          description: "Maximum budget in Colombian pesos as integer"
        },
        mustHaveCoverages: {
          type: "array",
          items: { type: "string" },
          description: "List of required insurance coverages"
        },
        clientPersona: {
          type: "string",
          description: "Brief description of the client profile"
        },
        notes: {
          type: "string",
          description: "Additional relevant notes from the text"
        }
      },
      additionalProperties: false
    };
    
    const completion = await backoff(
      async () => {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          temperature: 0, // Deterministic
          messages: [
            {
              role: "system",
              content: `You are a structured data extractor for insurance briefs. Extract only the requested information from the user's text.

CRITICAL RULES:
- Do not redact PII; extract structure only
- Never infer provider names  
- Output exactly the schema or return {"error":"schema_mismatch"}
- Only extract information that is explicitly mentioned
- For budget, convert all amounts to Colombian pesos (COP) as integers
- For categories, use only: Vehículos, Salud, Viajes, Vida, Hogar, Otro
- For coverages, use standard Spanish insurance terms
- Keep clientPersona brief and factual

If the text doesn't contain clear insurance information, return {"error":"schema_mismatch"}.`
            },
            {
              role: "user", 
              content: text
            }
          ],
          response_format: { 
            type: "json_schema",
            json_schema: {
              name: "brief_extraction",
              schema
            }
          }
        });

        if (!response.choices[0]?.message?.content) {
          throw new Error('Empty response from OpenAI');
        }

        return response;
      },
      { maxAttempts: 3, base: 500, factor: 2, jitter: 0.2 }
    );

    const content = completion.choices[0].message.content!;
    let parsed: any;
    
    try {
      parsed = JSON.parse(content);
    } catch (jsonError) {
      console.error('[briefParser] JSON parse error:', jsonError);
      telemetry.track(telemetry.events.PARSER_OUTPUT_SCHEMA_MISMATCH, { sessionId, userId });
      return { error: 'schema_mismatch' };
    }
    
    // Check for error response
    if (parsed.error) {
      telemetry.track(telemetry.events.PARSER_OUTPUT_SCHEMA_MISMATCH, { sessionId, userId });
      return { error: 'schema_mismatch' };
    }
    
    // Validate and merge with heuristic results
    const result: Partial<Brief> = { ...heuristicResult };
    const fieldsFound: string[] = Object.keys(heuristicResult);
    
    // Only use LLM results if they pass validation
    if (parsed.category && typeof parsed.category === 'string') {
      result.category = parsed.category as Brief['category'];
      if (!fieldsFound.includes('category')) fieldsFound.push('category');
    }
    
    if (parsed.maxBudgetCop && typeof parsed.maxBudgetCop === 'number' && parsed.maxBudgetCop > 0) {
      result.maxBudgetCop = parsed.maxBudgetCop;
      if (!fieldsFound.includes('maxBudgetCop')) fieldsFound.push('maxBudgetCop');
    }
    
    if (Array.isArray(parsed.mustHaveCoverages) && parsed.mustHaveCoverages.length > 0) {
      const validCoverages = parsed.mustHaveCoverages.filter((c: any) => typeof c === 'string' && c.length > 0);
      if (validCoverages.length > 0) {
        result.mustHaveCoverages = [...(result.mustHaveCoverages || []), ...validCoverages];
        if (!fieldsFound.includes('mustHaveCoverages')) fieldsFound.push('mustHaveCoverages');
      }
    }
    
    if (parsed.clientPersona && typeof parsed.clientPersona === 'string') {
      result.clientPersona = parsed.clientPersona;
      if (!fieldsFound.includes('clientPersona')) fieldsFound.push('clientPersona');
    }
    
    if (parsed.notes && typeof parsed.notes === 'string') {
      result.notes = parsed.notes;
      if (!fieldsFound.includes('notes')) fieldsFound.push('notes');
    }
    
    // Add raw text
    result.rawText = text;
    
    const latencyMs = Date.now() - startTime;
    telemetry.track(telemetry.events.BRIEF_PARSED_SUCCESS, {
      fieldsFilled: fieldsFound,
      latencyMs,
      sessionId,
      userId
    });
    
    return result;
    
  } catch (error) {
    console.error('[briefParser] LLM parsing error:', error);
    const { sessionId, userId } = await getUserContext();
    telemetry.track(telemetry.events.PARSER_OUTPUT_SCHEMA_MISMATCH, { sessionId, userId });
    return { error: 'schema_mismatch' };
  }
}
