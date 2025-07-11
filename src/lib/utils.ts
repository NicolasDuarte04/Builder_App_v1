import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Input validation for project details
const CASUAL_WORDS = [
  'hey', 'hi', 'hello', 'wait', 'okay', 'ok', 'hmm', 'umm', 'uh', 'well',
  'let me think', 'give me a sec', 'hold on', 'hang on', 'not sure',
  'i dont know', 'idk', 'maybe', 'sure', 'yes', 'no', 'yeah', 'yep', 'nope'
];

const PROJECT_NAME_PATTERNS = [
  /^(it's called|its called|the name is|i'll call it|call it|name it)\s+(.+)$/i,
  /^(.+?)\s+(is the name|will be the name)$/i,
  /^"([^"]+)"$/,
  /^'([^']+)'$/
];

const DESCRIPTION_PATTERNS = [
  /^(it will|it'll|it does|it helps|it allows|it enables|it's for|its for)\s+(.+)$/i,
  /^(description|desc|about|it's about|its about):\s*(.+)$/i,
  /^the app\s+(.+)$/i,
  /^this project\s+(.+)$/i
];

export function isLikelyValidName(input: string): boolean {
  if (!input || input.trim().length < 2) return false;
  
  const cleaned = input.trim().toLowerCase();
  
  // Check if it's a casual word
  if (CASUAL_WORDS.includes(cleaned)) return false;
  
  // Check if it's too long to be a name (likely a description)
  if (cleaned.length > 50) return false;
  
  // Check if it contains description-like phrases
  const descriptionIndicators = ['helps', 'allows', 'enables', 'for people', 'users can', 'that will'];
  if (descriptionIndicators.some(indicator => cleaned.includes(indicator))) return false;
  
  return true;
}

export function isLikelyValidDescription(input: string): boolean {
  if (!input || input.trim().length < 10) return false;
  
  const cleaned = input.trim().toLowerCase();
  
  // Check if it's a casual word
  if (CASUAL_WORDS.includes(cleaned)) return false;
  
  // Must have some substance - at least 10 characters and preferably action words
  const hasActionWords = /\b(help|allow|enable|create|build|make|provide|offer|connect|find|track|manage|organize|share|discover)\b/i.test(input);
  const hasDescriptiveLength = input.trim().length >= 15;
  
  return hasActionWords || hasDescriptiveLength;
}

export function extractProjectDetails(input: string): {
  name: string | null;
  description: string | null;
  confidence: 'high' | 'medium' | 'low';
} {
  const trimmed = input.trim();
  
  // Try to extract explicit patterns first
  for (const pattern of PROJECT_NAME_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const extractedName = match[1] || match[2];
      if (isLikelyValidName(extractedName)) {
        return { name: extractedName.trim(), description: null, confidence: 'high' };
      }
    }
  }
  
  for (const pattern of DESCRIPTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const extractedDesc = match[1] || match[2];
      if (isLikelyValidDescription(extractedDesc)) {
        return { name: null, description: extractedDesc.trim(), confidence: 'high' };
      }
    }
  }
  
  // Try to split by common separators
  const separators = [' - ', ' – ', ' — ', '. ', ': ', ' | '];
  for (const sep of separators) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep, 2);
      const [first, second] = parts.map(p => p.trim());
      
      if (isLikelyValidName(first) && isLikelyValidDescription(second)) {
        return { name: first, description: second, confidence: 'high' };
      }
    }
  }
  
  // Fallback: try to determine if it's more like a name or description
  if (isLikelyValidName(trimmed) && !isLikelyValidDescription(trimmed)) {
    return { name: trimmed, description: null, confidence: 'medium' };
  }
  
  if (isLikelyValidDescription(trimmed)) {
    return { name: null, description: trimmed, confidence: 'medium' };
  }
  
  // If we can't determine anything useful
  return { name: null, description: null, confidence: 'low' };
}

export function isCasualInput(input: string): boolean {
  const cleaned = input.trim().toLowerCase();
  
  // Check exact matches with casual words
  if (CASUAL_WORDS.includes(cleaned)) return true;
  
  // Check if it's very short and doesn't seem meaningful
  if (cleaned.length < 3) return true;
  
  // Check if it's just punctuation or numbers
  if (/^[.,!?;:\s\d]+$/.test(cleaned)) return true;
  
  return false;
} 