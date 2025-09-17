/**
 * Telemetry payload sanitization – removes/obfuscates PII and free-text.
 *
 * Rules:
 * - Strip free-text fields (brief text, notes, comments, message, stack, errors, raw bodies)
 * - Mask emails and phone numbers anywhere inside string values
 * - Recurse into nested objects/arrays; preserve only non-sensitive scalar data
 */

const SENSITIVE_TEXT_KEYS = new Set<string>([
  // Generic error/message fields
  'message', 'error', 'errormessage', 'cause', 'exception', 'stack', 'stacktrace', 'stack_trace', 'trace',
  // File/system paths
  'filename', 'file_name', 'filepath', 'file_path', 'path',
  // Free-text content fields
  'text', 'rawtext', 'raw_text', 'raw', 'body', 'content', 'input', 'query', 'prompt',
  // Brief-specific free-text
  'brief', 'brieftext', 'brief_text', 'notes', 'note', 'comment', 'comments', 'description',
  // Direct identifiers
  'email', 'phone', 'phonenumber', 'phone_number',
]);

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Conservative phone detector: "+" optional, allow separators, require at least 8 digits overall
const PHONE_REGEX = /(?<!\d)(?:\+?\d[\d\s\-()]{6,}\d)(?!\d)/g;

function maskSensitiveInString(value: string): string {
  if (typeof value !== 'string' || value.length === 0) return value;
  let result = value.replace(EMAIL_REGEX, '[redacted_email]');
  result = result.replace(PHONE_REGEX, '[redacted_phone]');
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function sanitizeTelemetryPayload(input: unknown): Record<string, any> {
  if (!isPlainObject(input)) return {};
  try {
    const visited = new WeakSet<object>();

    const sanitizeAny = (val: any): any => {
      if (val == null) return val;
      if (typeof val === 'string') return maskSensitiveInString(val);
      if (typeof val === 'number' || typeof val === 'boolean') return val;
      if (Array.isArray(val)) return val.map((v) => sanitizeAny(v));
      if (isPlainObject(val)) {
        if (visited.has(val)) return undefined;
        visited.add(val);
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          const lower = k.toLowerCase();
          if (SENSITIVE_TEXT_KEYS.has(lower)) continue;
          const sanitized = sanitizeAny(v);
          if (sanitized !== undefined) out[k] = sanitized;
        }
        return out;
      }
      // Drop functions/symbols/others
      return undefined;
    };

    const root = sanitizeAny(input);
    return isPlainObject(root) ? (root as Record<string, any>) : {};
  } catch {
    // Best-effort: if sanitization fails, drop payload rather than risk leaking details
    return {};
  }
}

export default sanitizeTelemetryPayload;


