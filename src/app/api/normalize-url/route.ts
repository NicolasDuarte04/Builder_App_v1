import { NextRequest, NextResponse } from 'next/server';
import { parseCopMoney } from '@/lib/money';
import { normalizeCoverageList } from '@/lib/coveragesMap';
import crypto from 'crypto';

export const runtime = 'nodejs';

interface NormalizedPlan {
  id: string;
  provider: string;
  name: string;
  priceEstCop?: number;
  coverages: string[];
  exclusions: string[];
  source: {
    kind: 'url';
    ref: string;
    updatedAt: string;
  };
}

interface RequestBody {
  url: string;
}

const MAX_CONTENT_LENGTH = 2 * 1024 * 1024; // 2MB
const FETCH_TIMEOUT = 10000; // 10 seconds

// Validate URL (allow http/https only)
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Fetch URL with timeout and size limit
async function fetchWithLimits(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Briki-Bot/1.0 (+https://briki.co)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_CONTENT_LENGTH) {
      throw new Error('Content too large');
    }

    // Read response with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response body');
    }

    let content = '';
    let totalLength = 0;
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalLength += value.length;
      if (totalLength > MAX_CONTENT_LENGTH) {
        throw new Error('Content exceeds size limit');
      }

      content += decoder.decode(value, { stream: true });
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Sanitize HTML content
function sanitizeHtml(html: string): string {
  return html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove inline event handlers
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
}

// Extract text content from HTML tags
function extractTextContent(html: string, tagPattern: RegExp): string[] {
  const matches = html.match(tagPattern) || [];
  return matches.map(match => {
    // Remove HTML tags and decode entities
    return match
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }).filter(Boolean);
}

// Extract provider/name from title or headers
function extractProviderAndName(html: string): { provider: string | null; name: string | null } {
  // Try to extract from title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Try to extract from h1 tags
  const h1Texts = extractTextContent(html, /<h1[^>]*>.*?<\/h1>/gi);
  
  // Try to extract from h2 tags as fallback
  const h2Texts = extractTextContent(html, /<h2[^>]*>.*?<\/h2>/gi);

  // Combine all potential sources
  const candidates = [title, ...h1Texts, ...h2Texts].filter(Boolean);

  if (candidates.length === 0) {
    return { provider: null, name: null };
  }

  // Simple heuristic: if text contains common insurance company names, extract provider
  const insuranceKeywords = [
    'seguros', 'seguro', 'insurance', 'axa', 'sura', 'bolivar', 'bolívar', 
    'allianz', 'zurich', 'colpatria', 'hdi', 'sbs', 'liberty'
  ];

  let provider: string | null = null;
  let name: string | null = null;

  for (const candidate of candidates) {
    const lowerCandidate = candidate.toLowerCase();
    
    // Check if this looks like a provider name
    if (insuranceKeywords.some(keyword => lowerCandidate.includes(keyword))) {
      if (!provider) {
        provider = candidate;
      }
    } else {
      // This might be a plan name
      if (!name) {
        name = candidate;
      }
    }
  }

  // If we didn't find a clear provider, use the first candidate as name
  if (!name && candidates.length > 0) {
    name = candidates[0];
  }

  return { provider, name };
}

// Extract price information
function extractPrice(html: string): number | null {
  // Look for price patterns in the HTML
  const pricePatterns = [
    // COP currency patterns
    /\$\s*[\d.,]+(?:\s*COP)?/gi,
    /COP\s*[\d.,]+/gi,
    /[\d.,]+\s*pesos/gi,
    // Generic price patterns
    /precio[:\s]*[\d.,]+/gi,
    /price[:\s]*[\d.,]+/gi,
    // Table cell or span containing numbers
    /<(?:td|span|div)[^>]*>[\s\$]*[\d.,]+[\s\$]*<\/(?:td|span|div)>/gi,
  ];

  for (const pattern of pricePatterns) {
    const matches = html.match(pattern) || [];
    for (const match of matches) {
      // Extract just the numeric part
      const numericPart = match.replace(/<[^>]*>/g, '').replace(/[^\d.,]/g, '');
      if (numericPart) {
        const parsed = parseCopMoney(numericPart);
        if (parsed && parsed > 0) {
          return parsed;
        }
      }
    }
  }

  return null;
}

// Extract benefits and exclusions from lists
function extractBenefitsAndExclusions(html: string): { benefits: string[]; exclusions: string[] } {
  const benefits: string[] = [];
  const exclusions: string[] = [];

  // Extract from unordered lists
  const ulMatches = html.match(/<ul[^>]*>[\s\S]*?<\/ul>/gi) || [];
  const olMatches = html.match(/<ol[^>]*>[\s\S]*?<\/ol>/gi) || [];
  
  // Extract from tables (look for the most data-dense table)
  const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
  
  const allLists = [...ulMatches, ...olMatches, ...tableMatches];
  
  // Find the most data-dense list/table
  let bestList = '';
  let maxItems = 0;
  
  for (const list of allLists) {
    const liItems = extractTextContent(list, /<li[^>]*>.*?<\/li>/gi);
    const tdItems = extractTextContent(list, /<td[^>]*>.*?<\/td>/gi);
    const allItems = [...liItems, ...tdItems];
    
    if (allItems.length > maxItems) {
      maxItems = allItems.length;
      bestList = list;
    }
  }

  if (bestList) {
    // Extract list items
    const liItems = extractTextContent(bestList, /<li[^>]*>.*?<\/li>/gi);
    const tdItems = extractTextContent(bestList, /<td[^>]*>.*?<\/td>/gi);
    const allItems = [...liItems, ...tdItems];

    for (const item of allItems) {
      const lowerItem = item.toLowerCase();
      
      // Check if this looks like an exclusion
      if (lowerItem.includes('exclu') || lowerItem.includes('no cubre') || 
          lowerItem.includes('excepto') || lowerItem.includes('limitación')) {
        exclusions.push(item);
      } else if (item.length > 3) { // Avoid very short items
        benefits.push(item);
      }
    }
  }

  // If we didn't find much in lists, look for common benefit keywords in paragraphs
  if (benefits.length < 3) {
    const benefitKeywords = [
      'cobertura', 'coverage', 'incluye', 'includes', 'beneficio', 'benefit',
      'asistencia', 'assistance', 'protección', 'protection'
    ];
    
    const pTexts = extractTextContent(html, /<p[^>]*>.*?<\/p>/gi);
    
    for (const text of pTexts) {
      const lowerText = text.toLowerCase();
      if (benefitKeywords.some(keyword => lowerText.includes(keyword)) && text.length > 10) {
        benefits.push(text);
      }
    }
  }

  return { benefits, exclusions };
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate URL
    if (!isValidUrl(body.url)) {
      return NextResponse.json(
        { error: 'Invalid URL. Only HTTP and HTTPS URLs are allowed.' },
        { status: 422 }
      );
    }

    // Fetch URL content
    let html: string;
    try {
      html = await fetchWithLimits(body.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch URL';
      return NextResponse.json(
        { error: `Failed to fetch URL: ${message}` },
        { status: 422 }
      );
    }

    // Sanitize HTML
    const sanitizedHtml = sanitizeHtml(html);

    // Extract data
    const { provider, name } = extractProviderAndName(sanitizedHtml);
    const price = extractPrice(sanitizedHtml);
    const { benefits, exclusions } = extractBenefitsAndExclusions(sanitizedHtml);

    // Canonicalize benefits using existing function
    const normalizedBenefits = normalizeCoverageList(benefits);
    const normalizedExclusions = normalizeCoverageList(exclusions);

    // Create normalized plan
    const plan: NormalizedPlan = {
      id: crypto.randomUUID(),
      provider: provider || 'Unknown Provider',
      name: name || 'Unnamed Plan',
      priceEstCop: price ?? undefined,
      coverages: normalizedBenefits,
      exclusions: normalizedExclusions,
      source: {
        kind: 'url',
        ref: body.url,
        updatedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(plan);

  } catch (error) {
    console.error('Error in normalize-url:', error);
    
    // Don't return raw HTML or expose internal errors
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: `Processing failed: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * Smoke test: Expected response shape
 * {
 *   id: string;           // UUID or similar
 *   name: string;         // Plan name
 *   provider: string;     // Insurance provider name
 *   priceEstCop?: number; // Optional estimated price in COP
 *   coverages: string[];  // Normalized coverage list
 *   exclusions: string[]; // Normalized exclusions list
 *   source: {
 *     kind: 'url';
 *     ref: string;       // Original URL
 *     updatedAt: string; // ISO date
 *   }
 * }
 */
