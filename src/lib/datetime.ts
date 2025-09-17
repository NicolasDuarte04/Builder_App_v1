// Centralized datetime formatting with fixed America/Bogota timezone
// Ensures short timezone name (e.g., "GMT-5") is included

const BOGOTA_TZ = 'America/Bogota';

function normalizeLocale(locale?: string): string {
  if (!locale) return 'es-CO';
  const lower = locale.toLowerCase();
  if (lower === 'es' || lower.startsWith('es-')) return 'es-CO';
  if (lower === 'en' || lower.startsWith('en-')) return 'en-US';
  return locale;
}

function isSameCalendarDayInBogota(a: Date, b: Date): boolean {
  const opts: Intl.DateTimeFormatOptions = { timeZone: BOGOTA_TZ, year: 'numeric', month: '2-digit', day: '2-digit' };
  const fmt = new Intl.DateTimeFormat('en-CA', opts); // stable YYYY-MM-DD-like ordering
  return fmt.format(a) === fmt.format(b);
}

export function formatZoned(input: Date | string | number, locale?: string): string {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';

  const effectiveLocale = normalizeLocale(locale);

  // Same-day times are rendered time-only with tz; otherwise date+time with tz
  const now = new Date();
  const sameDay = isSameCalendarDayInBogota(date, now);

  // Some environments (notably certain Safari versions) throw when combining
  // dateStyle/timeStyle with timeZoneName. To avoid this, format the main
  // portion without timeZoneName, then append the tz abbreviation obtained
  // via a separate formatter.
  const mainOptions: Intl.DateTimeFormatOptions = sameDay
    ? { timeZone: BOGOTA_TZ, timeStyle: 'short' }
    : { timeZone: BOGOTA_TZ, dateStyle: 'medium', timeStyle: 'short' };

  let mainText = '';
  try {
    mainText = date.toLocaleString(effectiveLocale, mainOptions);
  } catch {
    try {
      mainText = date.toLocaleString(undefined, mainOptions);
    } catch {
      // As a last resort, fall back to ISO substring
      mainText = new Date(date.getTime()).toISOString();
    }
  }

  // Try to extract a short timezone name separately
  try {
    const tzFormatter = new Intl.DateTimeFormat(effectiveLocale, {
      timeZone: BOGOTA_TZ,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    const parts = tzFormatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart && tzPart.value) {
      return `${mainText} ${tzPart.value}`;
    }
  } catch {
    // Ignore and just return main text
  }

  return mainText;
}

export const DATETIME_TZ = BOGOTA_TZ;


