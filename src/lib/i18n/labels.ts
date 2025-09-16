// Define TFunction type locally to avoid next-intl dependency issues
type TFunction = (key: string, options?: any) => any;

/**
 * Normalizes a string to snake_case, handling camelCase, dots, and special characters
 * Threat Model:
 * - Input: "CoverageTypes.muerte", "invalidez", "INVALIDEZ", "invalidez_total", "labels.enums.coverage_types.invalidez"
 * - Output: Always snake_case normalized
 */
const normalizeKey = (key: string): string => {
  if (!key || typeof key !== 'string') return '';
  
  // First, handle full translation paths - extract just the final segment
  // e.g. "labels.fields.price" -> "price", "labels.enums.coverage_types.muerte" -> "muerte"
  let normalized = key;
  const pathMatch = normalized.match(/^labels\.(fields|enums)(?:\.[\w_]+)?\.(\w+)$/);
  if (pathMatch) {
    normalized = pathMatch[2];
  }
  
  return normalized
    // Split camelCase BEFORE lowercasing so we don't lose boundaries
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    // Replace dots, spaces, and hyphens with underscore
    .replace(/[\s.\-]+/g, '_')
    // Remove any non-alphanumeric chars except underscore
    .replace(/[^a-zA-Z0-9_]/g, '')
    // Replace multiple underscores with single
    .replace(/_+/g, '_')
    // Trim underscores from ends
    .replace(/^_+|_+$/g, '')
    // Finally, lowercase everything
    .toLowerCase();
};

/**
 * Converts a string to human-readable Title Case
 * This is the final fallback when no translation exists
 */
const toTitleCase = (str: string): string => {
  if (!str) return '';
  
  // First normalize to ensure consistent input
  const normalized = normalizeKey(str);
  
  return normalized
    .split('_')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Strips various forms of kind prefix from an enum value
 * Handles: "CoverageTypes.muerte", "coverage_types.muerte", "coverageTypes_muerte", etc.
 * Edge case: If the value itself contains dots, only strip recognized prefixes
 */
const stripKindPrefix = (kind: string, value: string): string => {
  if (!kind || !value || typeof value !== 'string') return value || '';
  
  const normalizedKind = normalizeKey(kind);

  // Start from a working copy
  let v = value;

  // Remove global enum path prefixes if present
  v = v.replace(/^labels\.enums\./i, '');
  v = v.replace(/^enums\./i, '');

  // Helper functions for case variations
  const toCamelCase = (snake: string): string => {
    const parts = snake.split('_');
    if (parts.length === 0) return '';
    return parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  };

  const toPascalCase = (snake: string): string => {
    return snake
      .split('_')
      .filter(p => p.length > 0)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join('');
  };

  // Generate all possible prefix variants
  const variants = Array.from(new Set<string>([
    kind,
    normalizedKind,
    toCamelCase(normalizedKind),
    toPascalCase(normalizedKind),
  ]));

  // Test all separator combinations
  const prefixes: string[] = [];
  for (const variant of variants) {
    prefixes.push(`${variant}.`);
    prefixes.push(`${variant}_`);
    prefixes.push(`${variant}-`);
  }

  // Sort by length descending to match longest prefix first
  prefixes.sort((a, b) => b.length - a.length);

  // Case-insensitive prefix matching
  const lowerValue = v.toLowerCase();
  for (const prefix of prefixes) {
    if (lowerValue.startsWith(prefix.toLowerCase())) {
      return v.slice(prefix.length);
    }
  }

  return v;
};

/**
 * Creates a label resolver function using the provided translation function
 * 
 * Resolver Algorithm (Priority Order):
 * 1. Normalize inputs (handle camelCase, dots, prefixes)
 * 2. Try strict translation paths with t(key, {fallback: undefined})
 * 3. Fall back to humanized Title Case, never return raw keys
 * 
 * SSR/CSR Safety:
 * - Always returns primitive strings
 * - No function references or unstable objects
 * - Deterministic normalization
 */
export const makeLabelResolver = (t: TFunction) => {
  /**
   * Resolves a field label using the translation hierarchy
   * Examples:
   * - "price" -> checks labels.fields.price -> labels.price -> "Price"
   * - "waiting_times" -> checks labels.fields.waiting_times -> labels.waiting_times -> "Waiting Times"
   * - "labels.fields.price" -> normalizes to "price" then follows same path
   */
  const fieldLabel = (fieldKey: string): string => {
    if (!fieldKey || typeof fieldKey !== 'string') return '';
    
    const normalizedKey = normalizeKey(fieldKey);
    if (!normalizedKey) return '';
    
    try {
      // Priority 1: Try labels.fields.{normalized}
      const fieldPath = `labels.fields.${normalizedKey}`;
      const fieldTranslation = t(fieldPath, { fallback: undefined });
      if (fieldTranslation && typeof fieldTranslation === 'string' && fieldTranslation !== fieldPath) {
        return fieldTranslation;
      }

      // Priority 2: Try labels.{normalized}
      const directPath = `labels.${normalizedKey}`;
      const directTranslation = t(directPath, { fallback: undefined });
      if (directTranslation && typeof directTranslation === 'string' && directTranslation !== directPath) {
        return directTranslation;
      }

      // Priority 3: Fallback to human-readable Title Case
      return toTitleCase(normalizedKey);
    } catch {
      // Safe fallback if translation throws
      return toTitleCase(normalizedKey);
    }
  };

  /**
   * Resolves an enum label using the translation hierarchy
   * 
   * Input Examples & Resolution:
   * - ("coverage_types", "muerte") -> labels.enums.coverage_types.muerte -> "Death coverage"
   * - ("CoverageTypes", "invalidez") -> labels.enums.coverage_types.invalidez -> "Disability"
   * - ("sources", "pdf") -> labels.enums.sources.pdf -> "PDF"
   * - ("coverage_types", "CoverageTypes.muerte") -> strips prefix, then resolves
   * - ("coverage_types", "unknown_value") -> tries paths, falls back to "Unknown Value"
   * - ("coverage_types", "labels.enums.coverage_types.invalidez") -> strips path prefix, resolves
   */
  const enumLabel = (kind: string, value: string): string => {
    if (!kind || !value || typeof kind !== 'string' || typeof value !== 'string') return '';

    // Normalize the kind (e.g., "CoverageTypes" -> "coverage_types")
    const normalizedKind = normalizeKey(kind);
    if (!normalizedKind) return toTitleCase(value);

    // If caller passed a full labels.enums.* path, try it directly first
    if (/^labels\.enums\./i.test(value)) {
      const direct = t(value, { fallback: undefined });
      if (direct && typeof direct === 'string') {
        return direct;
      }
    }

    // Strip any prefixes from the value (handles legacy/mixed formats)
    const strippedValue = stripKindPrefix(kind, value);
    const normalizedValue = normalizeKey(strippedValue);
    if (!normalizedValue) return toTitleCase(strippedValue);

    try {
      // Priority 1: Try labels.enums.{kind}.{value}
      const enumPath = `labels.enums.${normalizedKind}.${normalizedValue}`;
      const enumTranslation = t(enumPath, { fallback: undefined });
      
      // Validate it's a real translation, not the key itself
      if (enumTranslation && typeof enumTranslation === 'string' && enumTranslation !== enumPath) {
        return enumTranslation;
      }

      // Priority 2: Try direct enum value translation at labels.{value}
      const directPath = `labels.${normalizedValue}`;
      const directTranslation = t(directPath, { fallback: undefined });
      
      if (directTranslation && typeof directTranslation === 'string' && directTranslation !== directPath) {
        return directTranslation;
      }

      // Priority 3: Human-readable fallback - never return dotted paths
      return toTitleCase(normalizedValue);
    } catch {
      // Safe fallback if translation throws
      return toTitleCase(normalizedValue);
    }
  };

  return {
    fieldLabel,
    enumLabel,
  };
};

export type LabelResolver = ReturnType<typeof makeLabelResolver>;
