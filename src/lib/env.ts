import { z } from "zod";

type ServerEnv = z.infer<typeof serverSchema>;
type PublicEnv = z.infer<typeof publicSchema>;

const serverSchema = z.object({
  NEXTAUTH_URL: z.string().min(1, "NEXTAUTH_URL is required"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Optional server-side keys
  OPENAI_API_KEY: z.string().optional(),
  UPLOAD_STATUS_SECRET: z.string().optional(),
  CATALOG_DB_URL: z.string().url().optional(),
  CATALOG_DB_RO_URL: z.string().url().optional(),
  // Legacy aliases
  DATABASE_URL: z.string().url().optional(),
  READWRITE: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SITE_URL: z.string().optional(),

  // Deployment metadata (optional)
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  VERCEL_GIT_COMMIT_REF: z.string().optional(),
  VERCEL_URL: z.string().optional(),

  // Runtime
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_POLICY_BUCKET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_BASE_URL: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  NEXT_PUBLIC_BUILD_ID: z.string().optional(),
  NEXT_PUBLIC_E2E_CAPTURE: z.string().optional(),
  NEXT_PUBLIC_TOOLBAR_DENSITY: z.string().optional(),
  NEXT_PUBLIC_ENABLE_ADMIN_METRICS: z.string().optional(),
  NEXT_PUBLIC_ENABLE_TEMPLATES_FALLBACK: z.string().optional(),
  NEXT_PUBLIC_SHOW_FILTER_DEBUG: z.string().optional(),
  NEXT_PUBLIC_BRIKI_DATA_SOURCE: z.string().optional(),
  NEXT_PUBLIC_FF_INCREDIBLE_BRIEF_PCT: z.string().optional(),
  NEXT_PUBLIC_BRIEF_PARSER_V2: z.string().optional(),
  NEXT_PUBLIC_LONG_PASTE_CHAR_LIMIT: z.string().optional(),
  NEXT_PUBLIC_LONG_PASTE_TOKEN_LIMIT: z.string().optional(),
  NEXT_PUBLIC_MULTI_PDF: z.string().optional(),
  NEXT_PUBLIC_ENABLE_PDF_VERIFY: z.string().optional(),
  NEXT_PUBLIC_ENABLE_BRC_PORTAL: z.string().optional(),
  NEXT_PUBLIC_ENABLE_PROPOSAL: z.string().optional(),
  NEXT_PUBLIC_BRC_PORTAL_ENABLED: z.string().optional(),
  NEXT_PUBLIC_DEBUG_PORTAL: z.string().optional(),
  NEXT_PUBLIC_PDF_THUMBS: z.string().optional(),
  NEXT_PUBLIC_APP_FLAVOR: z.string().optional(),
  NEXT_PUBLIC_TRIAL_GATE_ENABLED: z.string().optional(),
  NEXT_PUBLIC_FF_CURRENCY_NORM: z.string().optional(),
  NEXT_PUBLIC_FF_OCR_FALLBACK: z.string().optional(),
  NEXT_PUBLIC_FF_OCR_FALLBACK_PCT: z.string().optional(),
});

let loggedOnce = false;

function logOnce(message: string, extra?: unknown) {
  if (loggedOnce) return;
  loggedOnce = true;
  try { console.error(message, extra || ""); } catch {}
}

function parseWithPolicy<T extends z.ZodTypeAny>(schema: T, raw: unknown, label: string) {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data as z.infer<T>;

  const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
  const msg = `[env] ${label} validation failed: ${issues}`;

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    throw new Error(msg);
  } else {
    logOnce(msg);
    // Best-effort: return object with missing required fields as empty strings to keep runtime alive
    const fallback = { ...(raw as any) };
    // Coerce any undefined to empty strings for required keys we know
    if (label === "server") {
      for (const key of ["NEXTAUTH_URL","NEXTAUTH_SECRET","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"]) {
        if (!fallback[key]) fallback[key] = "";
      }
      if (!fallback["NODE_ENV"]) fallback["NODE_ENV"] = "production";
    }
    return fallback as z.infer<T>;
  }
}

type ServerRuntimeEnv = ServerEnv & {
  catalogDbUrlRW?: string;
  catalogDbUrlRO?: string;
  catalogDbReadWrite: boolean;
};

let serverCache: ServerRuntimeEnv | null = null;
function loadServerEnv(): ServerRuntimeEnv {
  if (typeof window !== 'undefined') {
    throw new Error('[env] env.server is only available on the server');
  }
  if (serverCache) return serverCache;
  const raw = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    // Accept legacy alias where URL was taken from NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.SERVICE_ROLE_KEY,

    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    UPLOAD_STATUS_SECRET: process.env.UPLOAD_STATUS_SECRET,
    CATALOG_DB_URL: process.env.CATALOG_DB_URL,
    CATALOG_DB_RO_URL: process.env.CATALOG_DB_RO_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    READWRITE: process.env.READWRITE,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,

    NODE_ENV: process.env.NODE_ENV as any,
  };

  const parsed = parseWithPolicy(serverSchema, raw, "server");

  // Derived getters for catalog DB config
  const catalogDbUrlRW = parsed.CATALOG_DB_URL ?? parsed.DATABASE_URL ?? undefined;
  const catalogDbUrlRO = parsed.CATALOG_DB_RO_URL ?? parsed.CATALOG_DB_URL ?? parsed.DATABASE_URL ?? undefined;
  const catalogDbReadWrite = parsed.READWRITE ? parsed.READWRITE === "true" : Boolean(parsed.CATALOG_DB_URL);

  serverCache = Object.freeze({
    ...parsed,
    catalogDbUrlRW,
    catalogDbUrlRO,
    catalogDbReadWrite,
  });
  return serverCache;
}

function loadPublicEnv(): PublicEnv {
  const raw: any = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_POLICY_BUCKET: process.env.NEXT_PUBLIC_POLICY_BUCKET,
    NEXT_PUBLIC_STRIPE_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
    NEXT_PUBLIC_E2E_CAPTURE: process.env.NEXT_PUBLIC_E2E_CAPTURE,
    NEXT_PUBLIC_TOOLBAR_DENSITY: process.env.NEXT_PUBLIC_TOOLBAR_DENSITY,
    NEXT_PUBLIC_ENABLE_ADMIN_METRICS: process.env.NEXT_PUBLIC_ENABLE_ADMIN_METRICS,
    NEXT_PUBLIC_ENABLE_TEMPLATES_FALLBACK: process.env.NEXT_PUBLIC_ENABLE_TEMPLATES_FALLBACK,
    NEXT_PUBLIC_SHOW_FILTER_DEBUG: process.env.NEXT_PUBLIC_SHOW_FILTER_DEBUG,
    NEXT_PUBLIC_BRIKI_DATA_SOURCE: process.env.NEXT_PUBLIC_BRIKI_DATA_SOURCE,
    NEXT_PUBLIC_FF_INCREDIBLE_BRIEF_PCT: process.env.NEXT_PUBLIC_FF_INCREDIBLE_BRIEF_PCT,
    NEXT_PUBLIC_BRIEF_PARSER_V2: process.env.NEXT_PUBLIC_BRIEF_PARSER_V2,
    NEXT_PUBLIC_LONG_PASTE_CHAR_LIMIT: process.env.NEXT_PUBLIC_LONG_PASTE_CHAR_LIMIT,
    NEXT_PUBLIC_LONG_PASTE_TOKEN_LIMIT: process.env.NEXT_PUBLIC_LONG_PASTE_TOKEN_LIMIT,
    NEXT_PUBLIC_MULTI_PDF: process.env.NEXT_PUBLIC_MULTI_PDF,
    NEXT_PUBLIC_ENABLE_PDF_VERIFY: process.env.NEXT_PUBLIC_ENABLE_PDF_VERIFY,
    NEXT_PUBLIC_ENABLE_BRC_PORTAL: process.env.NEXT_PUBLIC_ENABLE_BRC_PORTAL,
    NEXT_PUBLIC_ENABLE_PROPOSAL: process.env.NEXT_PUBLIC_ENABLE_PROPOSAL,
    NEXT_PUBLIC_BRC_PORTAL_ENABLED: process.env.NEXT_PUBLIC_BRC_PORTAL_ENABLED,
    NEXT_PUBLIC_DEBUG_PORTAL: process.env.NEXT_PUBLIC_DEBUG_PORTAL,
    NEXT_PUBLIC_PDF_THUMBS: process.env.NEXT_PUBLIC_PDF_THUMBS,
    NEXT_PUBLIC_APP_FLAVOR: process.env.NEXT_PUBLIC_APP_FLAVOR,
    NEXT_PUBLIC_TRIAL_GATE_ENABLED: process.env.NEXT_PUBLIC_TRIAL_GATE_ENABLED,
    NEXT_PUBLIC_FF_CURRENCY_NORM: process.env.NEXT_PUBLIC_FF_CURRENCY_NORM,
    NEXT_PUBLIC_FF_OCR_FALLBACK: process.env.NEXT_PUBLIC_FF_OCR_FALLBACK,
    NEXT_PUBLIC_FF_OCR_FALLBACK_PCT: process.env.NEXT_PUBLIC_FF_OCR_FALLBACK_PCT,
  };
  const parsed = parseWithPolicy(publicSchema, raw, "public");
  return Object.freeze(parsed);
}

export const env = {
  get server() {
    return loadServerEnv();
  }
} as const;

export function getPublicEnv(): PublicEnv {
  return loadPublicEnv();
}

// Convenience helpers
export function isDevelopment(): boolean {
  try { return (process.env.NODE_ENV || '').toString() !== 'production'; } catch { return false; }
}

export function getServerVar(name: string): string | undefined {
  try { return process.env[name]; } catch { return undefined; }
}

export function getPublicVar(name: string): string | undefined {
  try { return process.env[name]; } catch { return undefined; }
}

// One-liner boot log (no secrets)
if (typeof window === "undefined") {
  try {
    console.log("[env] validated: NEXTAUTH_URL/SECRET, SUPABASE_URL/SERVICE_ROLE, NEXT_PUBLIC_SUPABASE_*");
  } catch {}
}