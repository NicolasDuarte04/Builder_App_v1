/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { Pool, PoolClient } from 'pg';

type RawRecord = {
  id?: string;
  created_at?: string;
  is_valid?: boolean;
  is_duplicate?: boolean;
  attributes?: Record<string, { value: any; source_urls?: string[] } | undefined>;
};

type FlatRow = {
  provider_slug: string;
  provider_display: string;
  category_slug: 'autos' | 'salud' | string;
  plan_slug: string;
  plan_display: string;
  price_currency: string | null;
  price_min: number | null;
  pricing_model: 'quote' | 'monthly' | 'annual' | string | null;
  benefits: string[] | null;
  benefit_details: Record<string, any> | null;
  deductible: string | null;
  copay: string | null;
  waiting_period_days: number | null;
  geo_scope: string[] | null;
  target_personas: string[] | null;
  last_verified_at: string | null;
  source_primary_url: string;
  external_purchase_url: string | null;
  tags: string[] | null;
};

type IngestReport = {
  startedAt: string;
  inputPath: string;
  rowsRead: number;
  kept: number;
  rejected: number;
  rejectedByReason: Record<string, number>;
  countsByCategory: Record<string, number>;
  upsertedProviders: number;
  upsertedPlans: number;
  insertedBenefits: number;
  insertedPrices: number;
  insertedSources: number;
  notes: string[];
  sampleKeptPlanSlugs: string[];
  topUnmapped: Array<{ term: string; category: string; count: number; suggestion?: string }>
};

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`[ENV] Missing ${name}`);
  }
  return String(v);
}

function loadInputFile(): { data: RawRecord[]; path: string } {
  const root = process.cwd();
  const candidates = [
    path.join(root, 'scripts', 'etl', 'raw', 'raw_webhound_mapfre.json'),
    path.join(root, 'scripts', 'etl', 'raw_webhound_mapfre.json'),
    path.join(root, 'scripts', 'etl', 'raw_webhound_mapfre..json'),
  ];
  const p = candidates.find((c) => fs.existsSync(c));
  if (!p) {
    throw new Error(`Input file not found. Checked: ${candidates.join(', ')}`);
  }
  const raw = fs.readFileSync(p, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.data)) return { data: parsed.data as RawRecord[], path: p };
    if (Array.isArray(parsed)) return { data: parsed as RawRecord[], path: p };
    throw new Error('Unexpected JSON structure. Expected { data: [] } or [].');
  } catch (e: any) {
    throw new Error(`Invalid JSON in ${p}: ${e?.message || String(e)}`);
  }
}

function getAttrVal(a: any, key: string): any {
  if (!a) return undefined;
  const ent = a[key] || a[key.toLowerCase()] || a[key.toUpperCase()];
  if (ent && typeof ent === 'object' && 'value' in ent) return (ent as any).value;
  return undefined;
}

function toStringArray(v: any): string[] | null {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return null;
}

function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/\p{Diacritic}+/gu, '');
}

function parseBenefitDetails(raw: any): Record<string, any> | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as Record<string, any>;
  if (typeof raw !== 'string') return null;
  const s0 = raw.trim();
  if (!s0) return null;
  let s = s0;
  if (/\{\s*'/.test(s) || /':\s*'/.test(s)) {
    s = s.replace(/'/g, '"');
  }
  s = s.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function isOfficialMapfreUrl(u: string | null | undefined): boolean {
  if (!u || typeof u !== 'string' || !/^https?:\/\//i.test(u)) return false;
  try {
    const { hostname, pathname } = new URL(u);
    const host = hostname.toLowerCase();
    // Allow *.mapfre.com.co
    if (host === 'mapfre.com.co' || host.endsWith('.mapfre.com.co')) return true;
    // Allow mapfre.com if clearly Colombia section
    if (host === 'mapfre.com' || host.endsWith('.mapfre.com')) {
      const p = pathname.toLowerCase();
      if (/(^|\/)co(\/|$)/.test(p) || /colombia/.test(p)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  const now = Date.now();
  return Math.floor((now - t) / (1000 * 60 * 60 * 24));
}

// Externalized synonyms loader (shared with SURA ingester pattern)
type SynonymsConfig = {
  version?: number;
  updatedAt?: string;
  categories?: Record<string, Record<string, string[]>>;
};

function loadSynonymsConfig(): SynonymsConfig | null {
  try {
    const root = process.cwd();
    const candidateA = path.join(root, 'scripts', 'etl', 'transform', 'synonyms.json');
    const candidateB = path.join(root, 'scripts', 'etl', 'synonyms.json');
    const p = fs.existsSync(candidateA) ? candidateA : candidateB;
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw) as SynonymsConfig;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildNormalizedLookupFromConfig(cfg: SynonymsConfig | null): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  if (!cfg || !cfg.categories) return out;
  for (const [category, canonicalToSyns] of Object.entries(cfg.categories)) {
    const lookup: Record<string, string> = {};
    for (const [canonical, synonyms] of Object.entries(canonicalToSyns || {})) {
      if (!Array.isArray(synonyms)) continue;
      for (const s of synonyms) {
        const k = stripAccents(String(s || '')).trim().toLowerCase();
        if (!k) continue;
        lookup[k] = canonical;
      }
      // Also accept the canonical code itself as a synonym for convenience
      const selfKey = stripAccents(String(canonical || '')).trim().toLowerCase();
      if (selfKey) lookup[selfKey] = canonical;
    }
    out[category] = lookup;
  }
  return out;
}

// Built-in defaults (extended for MAPFRE to include direct canonical self-maps commonly present on their site)
const saludMap: Record<string, string> = {
  // direct canonical codes often appearing in MAPFRE
  hospitalizacion: 'hospitalizacion',
  maternidad: 'maternidad',
  cirugias: 'cirugias',
  urgencias: 'urgencias',
  odontologia: 'odontologia',
  medicamentos: 'medicamentos',

  // SURA-style synonyms reused
  sin_copagos: 'copago_bajo',
  medicina_general_no_programada_virtual: 'telemedicina',
  atencion_virtual_prioritaria_medico_general: 'telemedicina',
  psicologia: 'salud_mental',
  psiquiatria: 'salud_mental',
  emergencias_odontologicas_domicilio_clinica: 'odontologia',
  limpieza_oral_clinica: 'odontologia',
  imagenologia: 'diagnosticos',
  laboratorio_clinico: 'diagnosticos',
  atencion_medica_domiciliaria: 'atencion_domiciliaria',
  atencion_domiciliaria: 'atencion_domiciliaria',
  consulta_medica_especialista: 'consultas_especialistas',
  acceso_directo_especialistas: 'consultas_especialistas',
  atencion_presencial_especialista: 'consultas_especialistas',
  internista: 'consultas_especialistas',
  pediatra: 'consultas_especialistas',
  ginecologo: 'consultas_especialistas',
  oftalmologo: 'consultas_especialistas',
  urologo: 'consultas_especialistas',
  ortopedista: 'consultas_especialistas',
  otorrinolaringologo: 'consultas_especialistas',
  dermatologo: 'consultas_especialistas',
  nutricionista: 'consultas_especialistas',
  medicina_interna: 'consultas_especialistas',
  urologia: 'consultas_especialistas',
  ginecologia: 'consultas_especialistas',
  oftalmologia: 'consultas_especialistas',
  ortopedia: 'consultas_especialistas',
  otorrinolaringologia: 'consultas_especialistas',
  dermatologia: 'consultas_especialistas',
  nutricion: 'consultas_especialistas',
  habitacion_individual_hospitalizacion: 'hospitalizacion',
  bono_por_atencion_hospitalaria: 'hospitalizacion',
  cirugia_ambulatoria: 'cirugias',
  complicaciones_quirurgicas_ambulatorias: 'cirugias',
  atencion_prioritaria_presencial_virtual: 'urgencias',
  atencion_prioritaria_virtual_pediatra: 'urgencias',
};

const autosMap: Record<string, string> = {
  rc: 'rc',
  responsabilidad_civil: 'rc',
  'responsabilidad civil': 'rc',
  perdida_total: 'perdida_total',
  'pérdida_total': 'perdida_total',
  perdidatotal: 'perdida_total',
  danos_parciales: 'daños_parciales',
  'daños_parciales': 'daños_parciales',
  colision: 'colision',
  'colisión': 'colision',
  asistencia_grua: 'grua_km',
  grua_km: 'grua_km',
  carro_reemplazo: 'carro_reemplazo',
  llantas: 'cobertura_llantas',
  cobertura_llantas: 'cobertura_llantas',
  vidrios: 'cobertura_vidrios',
  cobertura_vidrios: 'cobertura_vidrios',
};

function normalizeBenefits(
  category: string,
  raw: string[] | null,
  categoryMap: Record<string, string>
): { codes: string[]; byCanonicalToRawKeys: Record<string, string[]>; unmapped: string[] } {
  const codesSet = new Set<string>();
  const mapRef = categoryMap;
  const canonicalToRaw: Record<string, string[]> = {};
  const unmapped: string[] = [];
  for (const b of raw || []) {
    const k = stripAccents(String(b || '')).trim().toLowerCase();
    if (!k) continue;
    const canon = mapRef[k];
    if (!canon) {
      unmapped.push(k);
      continue;
    }
    codesSet.add(canon);
    if (!canonicalToRaw[canon]) canonicalToRaw[canon] = [];
    canonicalToRaw[canon].push(k);
  }
  return { codes: Array.from(codesSet), byCanonicalToRawKeys: canonicalToRaw, unmapped };
}

function flatten(r: RawRecord): FlatRow | null {
  const a = r?.attributes || {};
  const v = (k: string) => getAttrVal(a, k);
  const provider_slug = String(v('provider_slug') || '').trim();
  const provider_display = String(v('provider_display') || '').trim();
  const category_slug = String(v('category_slug') || '').trim().toLowerCase();
  const plan_slug = String(v('plan_slug') || '').trim();
  const plan_display = String(v('plan_display') || '').trim();
  const price_currency = v('price_currency') != null ? String(v('price_currency')) : null;
  const price_minRaw = v('price_min');
  const price_min = typeof price_minRaw === 'number' ? price_minRaw : (price_minRaw != null ? Number(price_minRaw) : null);
  const pricing_model = v('pricing_model') != null ? String(v('pricing_model')).toLowerCase() : null;
  const benefits: string[] | null = Array.isArray(v('benefits')) ? (v('benefits') as any[]).map((x) => String(x)) : null;
  const benefit_details = parseBenefitDetails(v('benefit_details'));
  const deductible = v('deductible') != null ? String(v('deductible')) : null;
  const copay = v('copay') != null ? String(v('copay')) : null;
  const waiting_period_days = v('waiting_period_days') != null ? Number(v('waiting_period_days')) : null;
  const geo_scope = toStringArray(v('geo_scope'));
  const target_personas = toStringArray(v('target_personas'));
  const last_verified_at = v('last_verified_at') != null ? String(v('last_verified_at')) : null;
  const source_primary_url = String(v('source_primary_url') || '').trim();
  const external_purchase_url = v('external_purchase_url') != null ? String(v('external_purchase_url')) : null;
  const tags = toStringArray(v('tags'));

  if (!provider_slug || !provider_display || !category_slug || !plan_slug || !plan_display || !source_primary_url) {
    return null;
  }

  return {
    provider_slug,
    provider_display,
    category_slug: category_slug as any,
    plan_slug,
    plan_display,
    price_currency,
    price_min: price_min != null && Number.isFinite(price_min) ? Math.round(price_min * 100) / 100 : null,
    pricing_model: pricing_model as any,
    benefits,
    benefit_details,
    deductible,
    copay,
    waiting_period_days,
    geo_scope,
    target_personas,
    last_verified_at,
    source_primary_url,
    external_purchase_url,
    tags,
  };
}

async function withTx<T>(pool: Pool, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (e) {
    try { await client.query('rollback'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

async function ensureBenefitMaster(c: PoolClient, category: string, code: string) {
  await c.query(
    `insert into plans_v3.benefits_master (category_slug, benefit_code) values ($1, $2)
     on conflict (category_slug, benefit_code) do nothing`,
    [category, code]
  );
}

async function upsertProvider(c: PoolClient, slug: string, display: string): Promise<string> {
  const res = await c.query(
    `insert into plans_v3.providers (provider_slug, display_name)
     values ($1, $2)
     on conflict (provider_slug) do update set display_name = excluded.display_name, updated_at = now()
     returning id`,
    [slug, display]
  );
  return res.rows[0].id as string;
}

async function upsertPlan(c: PoolClient, args: {
  provider_id: string;
  plan_slug: string;
  display_name: string;
  category_slug: string;
  price_currency: string | null;
  price_min: number | null;
  pricing_model: string | null;
  geo_scope: string[] | null;
  target_personas: string[] | null;
  deductible: string | null;
  copay: string | null;
  waiting_period_days: number | null;
  source_primary_url: string;
  external_purchase_url: string | null;
  last_verified_at: string | null;
  tags: string[] | null;
  completeness_tier: 'gold' | 'silver' | 'bronze' | null;
  field_sources_json: any | null;
}): Promise<string> {
  const res = await c.query(
    `insert into plans_v3.plans (
      provider_id, plan_slug, display_name, category_slug, price_currency, price_min, pricing_model,
      geo_scope, target_personas, deductible, copay, waiting_period_days, source_primary_url,
      external_purchase_url, last_verified_at, tags, completeness_tier, field_sources_json, updated_at, is_active
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now(), true
    )
    on conflict (provider_id, plan_slug) do update set
      display_name = excluded.display_name,
      category_slug = excluded.category_slug,
      price_currency = excluded.price_currency,
      price_min = excluded.price_min,
      pricing_model = excluded.pricing_model,
      geo_scope = excluded.geo_scope,
      target_personas = excluded.target_personas,
      deductible = excluded.deductible,
      copay = excluded.copay,
      waiting_period_days = excluded.waiting_period_days,
      source_primary_url = excluded.source_primary_url,
      external_purchase_url = excluded.external_purchase_url,
      last_verified_at = excluded.last_verified_at,
      tags = excluded.tags,
      completeness_tier = coalesce(excluded.completeness_tier, plans_v3.plans.completeness_tier),
      field_sources_json = coalesce(excluded.field_sources_json, plans_v3.plans.field_sources_json),
      updated_at = now(),
      is_active = true
    returning id`,
    [
      args.provider_id,
      args.plan_slug,
      args.display_name,
      args.category_slug,
      args.price_currency,
      args.price_min,
      args.pricing_model,
      args.geo_scope,
      args.target_personas,
      args.deductible,
      args.copay,
      args.waiting_period_days,
      args.source_primary_url,
      args.external_purchase_url,
      args.last_verified_at,
      args.tags,
      args.completeness_tier,
      args.field_sources_json ? JSON.stringify(args.field_sources_json) : null,
    ]
  );
  return res.rows[0].id as string;
}

async function replacePlanBenefits(
  c: PoolClient,
  planId: string,
  category: string,
  canonicalCodes: string[],
  details: Record<string, any> | null,
  byCanonicalToRaw: Record<string, string[]>
) {
  await c.query(`delete from plans_v3.plan_benefits where plan_id = $1`, [planId]);
  let inserted = 0;
  for (const code of canonicalCodes) {
    let valueJson: any = null;
    if (details && byCanonicalToRaw[code] && byCanonicalToRaw[code].length > 0) {
      const rawKey = byCanonicalToRaw[code].find((k) => Object.prototype.hasOwnProperty.call(details, k));
      if (rawKey && details[rawKey] && typeof details[rawKey] === 'object') {
        valueJson = details[rawKey];
      }
    }
    await c.query(
      `insert into plans_v3.plan_benefits (plan_id, benefit_code, category_slug, value_json)
       values ($1, $2, $3, $4)
       on conflict (plan_id, benefit_code) do update set value_json = excluded.value_json`,
      [planId, code, category, valueJson ? JSON.stringify(valueJson) : null]
    );
    inserted++;
  }
  return inserted;
}

async function insertPlanPriceIfAny(c: PoolClient, planId: string, capturedAt: string | null, currency: string | null, price: number | null, sourceUrl: string | null) {
  if (price == null || !Number.isFinite(price) || price <= 0) return 0;
  const curr = currency || 'COP';
  const cap = capturedAt ? new Date(capturedAt).toISOString() : new Date().toISOString();
  await c.query(
    `insert into plans_v3.plan_prices (plan_id, captured_at, price_currency, price, source_url)
     values ($1,$2,$3,$4,$5)
     on conflict do nothing`,
    [planId, cap, curr, price, sourceUrl]
  );
  return 1;
}

async function insertPlanSource(c: PoolClient, planId: string, url: string, capturedAt: string | null) {
  const cap = capturedAt ? new Date(capturedAt).toISOString() : new Date().toISOString();
  await c.query(
    `insert into plans_v3.plan_sources (plan_id, source_type, url, captured_at)
     values ($1,'official_site',$2,$3)
     on conflict do nothing`,
    [planId, url, cap]
  );
  return 1;
}

function computeTier(category: string, deductible: string | null, copay: string | null): 'gold' | 'silver' | null {
  if (category === 'autos' && deductible && deductible.trim()) return 'gold';
  if (category === 'salud' && copay && copay.trim()) return 'gold';
  return 'silver';
}

function canonicalizeCategory(cat: string): 'autos' | 'salud' | string {
  const c = String(cat || '').toLowerCase();
  if (c === 'auto' || c === 'autos') return 'autos';
  if (c === 'salud' || c === 'health') return 'salud';
  return c;
}

async function main() {
  const startedAt = new Date().toISOString();
  const { data, path: inputPath } = loadInputFile();

  const pool = new Pool({ connectionString: getEnv('CATALOG_DB_URL'), ssl: { rejectUnauthorized: false }, max: 4 });

  const report: IngestReport = {
    startedAt,
    inputPath,
    rowsRead: data.length,
    kept: 0,
    rejected: 0,
    rejectedByReason: {},
    countsByCategory: {},
    upsertedProviders: 0,
    upsertedPlans: 0,
    insertedBenefits: 0,
    insertedPrices: 0,
    insertedSources: 0,
    notes: [],
    sampleKeptPlanSlugs: [],
    topUnmapped: [],
  };

  const rejections: Array<{ plan_slug?: string; category?: string; reason: string } & Partial<FlatRow>> = [];
  const unmappedCountsByCategory: Record<string, Record<string, number>> = { autos: {}, salud: {} };

  try {
    // Load external synonyms once per run and build normalized lookups
    const synonymsCfg = loadSynonymsConfig();
    const externalLookups = buildNormalizedLookupFromConfig(synonymsCfg);

    await withTx(pool, async (c) => {
      for (const rec of data) {
        const flat = flatten(rec);
        if (!flat) {
          report.rejected++;
          rejections.push({ reason: 'missing required core fields' });
          report.rejectedByReason['missing_fields'] = (report.rejectedByReason['missing_fields'] || 0) + 1;
          continue;
        }

        const category = canonicalizeCategory(flat.category_slug);

        // Gate: official MAPFRE URL
        if (!isOfficialMapfreUrl(flat.source_primary_url)) {
          report.rejected++;
          rejections.push({ plan_slug: flat.plan_slug, category, reason: 'non_official_source_url' });
          report.rejectedByReason['non_official_source_url'] = (report.rejectedByReason['non_official_source_url'] || 0) + 1;
          continue;
        }
        // Gate: category
        if (!(category === 'autos' || category === 'salud')) {
          report.rejected++;
          rejections.push({ plan_slug: flat.plan_slug, category, reason: 'unsupported_category' });
          report.rejectedByReason['unsupported_category'] = (report.rejectedByReason['unsupported_category'] || 0) + 1;
          continue;
        }
        // Gate: pricing present (price_min or quote)
        if (!(flat.price_min != null || String(flat.pricing_model || '') === 'quote')) {
          report.rejected++;
          rejections.push({ plan_slug: flat.plan_slug, category, reason: 'missing_pricing' });
          report.rejectedByReason['missing_pricing'] = (report.rejectedByReason['missing_pricing'] || 0) + 1;
          continue;
        }
        // Normalize benefits and gate >=4 canonical
        const defaultMap = category === 'autos' ? autosMap : saludMap;
        const externalMap = externalLookups[category] || {};
        const mergedMap: Record<string, string> = { ...defaultMap, ...externalMap };
        const { codes: canonicalBenefits, byCanonicalToRawKeys, unmapped } = normalizeBenefits(
          category,
          flat.benefits || [],
          mergedMap
        );
        for (const term of unmapped) {
          const bucket = (unmappedCountsByCategory[category] ||= {});
          bucket[term] = (bucket[term] || 0) + 1;
        }
        if (canonicalBenefits.length < 4) {
          report.rejected++;
          rejections.push({ plan_slug: flat.plan_slug, category, reason: 'insufficient_canonical_benefits' });
          report.rejectedByReason['insufficient_canonical_benefits'] = (report.rejectedByReason['insufficient_canonical_benefits'] || 0) + 1;
          continue;
        }
        // Gate: last_verified_at within 180 days
        if (daysSince(flat.last_verified_at) > 180) {
          report.rejected++;
          rejections.push({ plan_slug: flat.plan_slug, category, reason: 'stale_verification' });
          report.rejectedByReason['stale_verification'] = (report.rejectedByReason['stale_verification'] || 0) + 1;
          continue;
        }

        // Ensure benefit codes exist in master
        for (const code of canonicalBenefits) {
          await ensureBenefitMaster(c, category, code);
        }

        // Upsert provider, then plan
        const providerId = await upsertProvider(c, flat.provider_slug, flat.provider_display);
        report.upsertedProviders++;

        const tier = computeTier(category, flat.deductible, flat.copay);
        const fieldSources: any = {};
        if (flat.copay && category === 'salud') fieldSources.copay = 'web';
        if (flat.deductible && category === 'autos') fieldSources.deductible = 'web';

        const planId = await upsertPlan(c, {
          provider_id: providerId,
          plan_slug: flat.plan_slug,
          display_name: flat.plan_display,
          category_slug: category,
          price_currency: flat.price_currency,
          price_min: flat.price_min,
          pricing_model: flat.pricing_model,
          geo_scope: flat.geo_scope || ['CO'],
          target_personas: flat.target_personas || [],
          deductible: flat.deductible,
          copay: flat.copay,
          waiting_period_days: flat.waiting_period_days,
          source_primary_url: flat.source_primary_url,
          external_purchase_url: flat.external_purchase_url,
          last_verified_at: flat.last_verified_at,
          tags: flat.tags || [],
          completeness_tier: tier,
          field_sources_json: Object.keys(fieldSources).length ? fieldSources : null,
        });
        report.upsertedPlans++;

        // Replace plan_benefits
        report.insertedBenefits += await replacePlanBenefits(
          c,
          planId,
          category,
          canonicalBenefits,
          flat.benefit_details,
          byCanonicalToRawKeys
        );

        // Insert price & sources
        report.insertedPrices += await insertPlanPriceIfAny(
          c,
          planId,
          flat.last_verified_at,
          flat.price_currency,
          flat.price_min,
          flat.source_primary_url
        );
        report.insertedSources += await insertPlanSource(c, planId, flat.source_primary_url, flat.last_verified_at);

        report.kept++;
        report.countsByCategory[category] = (report.countsByCategory[category] || 0) + 1;
        if (report.sampleKeptPlanSlugs.length < 8) report.sampleKeptPlanSlugs.push(flat.plan_slug);
      }
    });
  } finally {
    await pool.end().catch(() => {});
  }

  // Compute top unmapped terms across categories with rough suggestions
  const suggestions: Record<string, string> = {
    robo_parcial: 'robo_parcial',
    terremoto: 'terremoto',
    terrorismo: 'terrorismo',
    amparo_patrimonial: 'amparo_patrimonial',
    asistencia_juridica: 'asistencia_juridica',
    accesorios: 'accesorios',
    accidentes_personales: 'accidentes_personales',
    consultas_ilimitadas: 'consultas_especialistas',
    marcacion_gratuita: 'marcacion_gratuita',
    traslado_descuento: 'traslado_descuento',
    canasta_familiar: 'canasta_familiar',
    renta_educativa: 'renta_educativa',
  };
  const top: Array<{ term: string; category: string; count: number; suggestion?: string }> = [];
  for (const [cat, counts] of Object.entries(unmappedCountsByCategory)) {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [term, count] of entries) {
      top.push({ term, category: cat, count, suggestion: suggestions[term] });
    }
  }
  report.topUnmapped = top;

  // Write report + rejections
  const outDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(outDir, `ingest_mapfre_plans_v3_report_${ts}.json`);
  const rejectsPath = path.join(outDir, `ingest_mapfre_plans_v3_rejected_${ts}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(rejectsPath, JSON.stringify(rejections, null, 2));

  console.log('[INGEST] MAPFRE → plans_v3 complete');
  console.log(report);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[INGEST] failed', e);
    process.exit(1);
  });
}


