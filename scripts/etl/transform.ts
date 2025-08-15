/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { PlanV2, PlanV2Type, WebHoundRowLoose, Country, Currency, WebHoundRowLooseType } from './schema';
import { normalizeCategory, normalizeProvider, inferTags } from './mappings';
import {
  classifyAndAssignLinks,
  convertToMonthly,
  dedupNormalized,
  enforceCountryCurrency,
  enforcePriceRanges,
  explicitUSDMarkerFromFields,
  hasAtMostTwoDecimals,
  parseMaybeNumber,
  roundToTwoDecimals,
  cleanBenefits,
  ensureBenefitCount,
} from './validate';

type Report = {
  countsByCountry: Record<string, number>;
  countsByCategory: Record<string, number>;
  countsByProvider: Record<string, number>;
  priceStatsByCountry: Record<string, { min: number; max: number; avg: number; median: number; count: number }>;
  usdRows: Array<{ id?: string; provider?: string; country?: string; reason?: string }>;
  linkQuality: { missingWebsite: number; pdfDetected: number };
  benefitLengthDistribution: Record<string, number>;
  coercions: string[];
};

function slugify(input: string): string {
  const s = input
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-');
  return s;
}

function stableId(provider: string, country: Country, name: string): string {
  const rawId = `${provider}|${country}|${slugify(name)}`;
  const id = 'plan_' + crypto.createHash('sha1').update(rawId).digest('hex').slice(0, 16);
  return id;
}

function pickFirstString(...values: Array<unknown>): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function arrayFrom(...candidates: Array<unknown>): string[] {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c.map((s) => String(s));
  }
  return [];
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function toCsvRow(plan: PlanV2Type): string {
  const cells = [
    plan.id,
    plan.provider,
    plan.name,
    plan.name_en,
    plan.category,
    plan.country,
    plan.base_price.toFixed(2),
    plan.currency,
    plan.external_link,
    plan.brochure_link ?? '',
    plan.benefits.join(' | '),
    plan.benefits_en.join(' | '),
    plan.min_age?.toString() ?? '',
    plan.max_age?.toString() ?? '',
    (plan.tags ?? []).join(' | '),
  ];
  return cells
    .map((c) => {
      const s = String(c);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    })
    .join(',');
}

function toSqlInsert(plan: PlanV2Type): string {
  const cols = [
    'id',
    'provider',
    'name',
    'name_en',
    'category',
    'country',
    'base_price',
    'currency',
    'external_link',
    'brochure_link',
    'benefits',
    'benefits_en',
    'min_age',
    'max_age',
    'tags',
  ];
  const vals = [
    plan.id,
    plan.provider,
    plan.name,
    plan.name_en,
    plan.category,
    plan.country,
    plan.base_price,
    plan.currency,
    plan.external_link,
    plan.brochure_link ?? null,
    JSON.stringify(plan.benefits),
    JSON.stringify(plan.benefits_en),
    plan.min_age ?? null,
    plan.max_age ?? null,
    JSON.stringify(plan.tags ?? []),
  ];
  const escaped = vals.map((v) => {
    if (v === null) return 'NULL';
    if (typeof v === 'number') return v.toString();
    return `'${String(v).replace(/'/g, "''")}'`;
  });
  return `INSERT INTO plans_v2 (${cols.join(', ')}) VALUES (${escaped.join(', ')});`;
}

function printOnePageSummary(report: Report, validCount: number, rejectedCount: number, outDir: string) {
  console.log('—'.repeat(60));
  console.log('Briki ETL: WebHound JSON → BrikiDB v2');
  console.log(`Valid: ${validCount} | Rejected: ${rejectedCount}`);
  console.log('Counts by country:', report.countsByCountry);
  console.log('Counts by category:', report.countsByCategory);
  console.log('Link quality:', report.linkQuality);
  console.log('Coercions:', report.coercions.length);
  console.log(`Outputs written to: ${outDir}`);
  console.log('—'.repeat(60));
}

function main() {
  const args = process.argv.slice(2);
  const root = process.cwd();
  const defaultInput = path.join(root, 'scripts', 'etl', 'sample-input.json');
  const inputPath = args[0] ? path.resolve(root, args[0]) : defaultInput;
  const outDir = path.join(root, 'scripts', 'etl', 'dist');
  ensureDir(outDir);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  let inputJson: unknown;
  try {
    inputJson = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON input');
    process.exit(1);
  }
  let rows: Array<unknown> = [];
  if (Array.isArray(inputJson)) rows = inputJson;
  else if (inputJson && typeof inputJson === 'object' && Array.isArray((inputJson as any).rows)) rows = (inputJson as any).rows;
  else if (inputJson && typeof inputJson === 'object' && Array.isArray((inputJson as any).data)) rows = (inputJson as any).data;
  else rows = [];

  const rejects: Array<{ row: unknown; reasons: string[] }> = [];
  const valid: PlanV2Type[] = [];
  const report: Report = {
    countsByCountry: {},
    countsByCategory: {},
    countsByProvider: {},
    priceStatsByCountry: {},
    usdRows: [],
    linkQuality: { missingWebsite: 0, pdfDetected: 0 },
    benefitLengthDistribution: {},
    coercions: [],
  };

  function flattenAttributesIfPresent(row: any): WebHoundRowLooseType {
    if (!row || typeof row !== 'object' || !row.attributes || typeof row.attributes !== 'object') {
      return row as WebHoundRowLooseType;
    }
    const a = row.attributes as Record<string, { value: unknown }>;
    const val = (k: string): any => (a[k] ? (a[k].value as any) : undefined);
    const strOrUndef = (v: any): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const urlOrUndef = (v: any): string | undefined => {
      const s = strOrUndef(v);
      if (!s) return undefined;
      if (/^https?:\/\//i.test(s)) return s;
      return undefined;
    };
    const toArray = (v: any): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : typeof v === 'string' && v.trim() ? [v] : []);
    const price = typeof val('base_price') === 'number' ? (val('base_price') as number) : undefined;
    const currency = strOrUndef(val('currency'));

    const links: any = {};
    const product = urlOrUndef(val('external_link')) || urlOrUndef(val('source_url'));
    if (product) links.product = product;
    const brochure = urlOrUndef(val('brochure_link'));
    if (brochure) links.brochure = brochure;

    const flat: any = {
      provider: strOrUndef(val('provider')),
      name: strOrUndef(val('name')),
      title: strOrUndef(val('name')),
      title_en: strOrUndef(val('name_en')),
      category: strOrUndef(val('category')),
      country: strOrUndef(val('country')),
      benefits: toArray(val('benefits')),
      benefits_en: toArray(val('benefits_en')),
      tags: toArray(val('tags')),
      links: Object.keys(links).length ? links : undefined,
      price: price !== undefined || currency
        ? { amount: price, period: 'month', currency }
        : undefined,
    };

    const minAgeRaw = val('min_age');
    const maxAgeRaw = val('max_age');
    if (minAgeRaw !== null && minAgeRaw !== undefined) flat.min_age = minAgeRaw;
    if (maxAgeRaw !== null && maxAgeRaw !== undefined) flat.max_age = maxAgeRaw;

    return flat as WebHoundRowLooseType;
  }

  for (const rawRow of rows) {
    const row = flattenAttributesIfPresent(rawRow);
    const parsed = WebHoundRowLoose.safeParse(row);
    if (!parsed.success) {
      rejects.push({ row, reasons: ['Row failed loose parse'] });
      continue;
    }
    const r = parsed.data;

    // Resolve core fields
    const providerRaw = pickFirstString(r.provider_name, r.provider, r.company) || '';
    const provider = normalizeProvider(providerRaw);
    const name = pickFirstString(r.title, r.name, r.plan_name) || '';
    const name_en = pickFirstString(r.title_en, r.english_name) || name;
    const categoryRaw = pickFirstString(r.category, r.category_raw, r.product_type, r.type) || 'otros';
    const category = normalizeCategory(categoryRaw);

    const countryStr = (pickFirstString(r.country, r.country_code) || '').toUpperCase();
    const country = countryStr === 'CO' ? 'CO' : countryStr === 'MX' ? 'MX' : (null as unknown as Country);
    if (!provider || !name || !country) {
      rejects.push({ row, reasons: ['Missing provider/name/country'] });
      continue;
    }

    // Links: pick potential candidates and classify
    const { external_link, brochure_link, rejectReason, warnings } = classifyAndAssignLinks([
      r.links?.product,
      r.links?.website,
      r.links?.url,
      r.links?.quote,
      r.links?.pdf,
      (r as any).source_url, // for flattened dataset
      r.product_url,
      r.website,
      r.url,
      r.quote_url,
      r.pdf_url,
      r.brochure_url,
      r.links?.brochure,
    ]);
    if (warnings.some((w) => /PDF detected/.test(w))) report.linkQuality.pdfDetected++;
    if (!external_link) {
      report.linkQuality.missingWebsite++;
      rejects.push({ row, reasons: [rejectReason || 'Missing external_link'] });
      continue;
    }

    // Pricing
    const periodic = r.price?.amount ?? r.monthly_price ?? r.base_price ?? r.price;
    let amount = parseMaybeNumber(
      typeof periodic === 'object' && periodic && 'amount' in (periodic as any)
        ? (periodic as any).amount
        : (periodic as any)
    );
    if (amount === null) amount = null;
    const period = r.price?.period ?? 'month';
    let monthly = amount !== null ? convertToMonthly(amount, period) : null;
    if (monthly === null || monthly === 0) {
      rejects.push({ row, reasons: ['Missing or zero price'] });
      continue;
    }
    monthly = roundToTwoDecimals(monthly);
    if (!hasAtMostTwoDecimals(monthly)) {
      monthly = roundToTwoDecimals(monthly);
    }

    // Currency
    const explicitUSD = explicitUSDMarkerFromFields({
      title: r.title,
      title_en: r.title_en,
      description: r.description,
      notes: r.notes,
    });
    const { currency, coerced, reason, usdJustified } = enforceCountryCurrency(country, r.price?.currency || r.currency, explicitUSD);
    if (coerced && reason) report.coercions.push(reason);
    if (currency === 'USD') {
      report.usdRows.push({ provider, country, reason });
    }

    const range = enforcePriceRanges(country, monthly);
    if (!range.ok) {
      rejects.push({ row, reasons: [range.reason || 'Price out of range'] });
      continue;
    }

    // Benefits
    const benefitsRaw = arrayFrom(r.benefits, r.features, r.bulletPoints);
    let benefits = ensureBenefitCount(cleanBenefits(benefitsRaw));
    let benefits_en = ensureBenefitCount(cleanBenefits(arrayFrom(r.benefits_en)));
    if (benefits.length < 3) {
      // Try to synthesize from description if too few
      if (r.description) {
        const sentences = String(r.description)
          .split(/[.!?]/)
          .map((s) => s.trim())
          .filter(Boolean);
        benefits = ensureBenefitCount(dedupNormalized([...benefits, ...sentences.slice(0, 6)]));
      }
    }
    if (benefits.length < 3) {
      rejects.push({ row, reasons: ['Insufficient benefits (<3)'] });
      continue;
    }
    if (benefits_en.length < 3) {
      benefits_en = benefits.slice(0, Math.min(benefits.length, 12));
    }

    // Optional ages
    const min_age = parseMaybeNumber(r.min_age ?? undefined) ?? undefined;
    const max_age = parseMaybeNumber(r.max_age ?? undefined) ?? undefined;

    // Tags
    const tags = Array.from(new Set([...(r.tags || []), ...(r.keywords || []), ...inferTags(name, benefits)]));

    // Final assembly
    const id = stableId(provider, country, name);
    const candidate: PlanV2Type = {
      id,
      provider,
      name,
      name_en,
      category,
      country,
      base_price: monthly,
      currency: currency as Currency,
      external_link,
      brochure_link: brochure_link,
      benefits,
      benefits_en,
      min_age,
      max_age,
      tags: tags.length ? tags : undefined,
    };

    const strict = PlanV2.safeParse(candidate);
    if (!strict.success) {
      rejects.push({ row, reasons: ['PlanV2 validation failed', strict.error.toString()] });
      continue;
    }
    valid.push(candidate);

    // Reporting
    report.countsByCountry[country] = (report.countsByCountry[country] || 0) + 1;
    report.countsByCategory[category] = (report.countsByCategory[category] || 0) + 1;
    report.countsByProvider[provider] = (report.countsByProvider[provider] || 0) + 1;
    report.benefitLengthDistribution[String(candidate.benefits.length)] =
      (report.benefitLengthDistribution[String(candidate.benefits.length)] || 0) + 1;
  }

  // Price stats by country
  for (const [country, count] of Object.entries(report.countsByCountry)) {
    const prices = valid.filter((v) => v.country === (country as Country)).map((v) => v.base_price);
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;
    const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const med = median(prices);
    report.priceStatsByCountry[country] = {
      min: roundToTwoDecimals(min),
      max: roundToTwoDecimals(max),
      avg: roundToTwoDecimals(avg),
      median: roundToTwoDecimals(med),
      count,
    };
  }

  // Outputs
  const jsonPath = path.join(outDir, 'plans_v2.json');
  const csvPath = path.join(outDir, 'plans_v2.csv');
  const sqlPath = path.join(outDir, 'plans_v2.sql');
  const rejectedPath = path.join(outDir, 'plans_v2_rejected.json');
  const reportPath = path.join(outDir, 'plans_v2_report.json');

  fs.writeFileSync(jsonPath, JSON.stringify(valid, null, 2));
  const header = [
    'id',
    'provider',
    'name',
    'name_en',
    'category',
    'country',
    'base_price',
    'currency',
    'external_link',
    'brochure_link',
    'benefits',
    'benefits_en',
    'min_age',
    'max_age',
    'tags',
  ].join(',');
  fs.writeFileSync(csvPath, header + '\n' + valid.map((v) => toCsvRow(v)).join('\n'));
  fs.writeFileSync(sqlPath, valid.map((v) => toSqlInsert(v)).join('\n') + '\n');
  fs.writeFileSync(rejectedPath, JSON.stringify(rejects, null, 2));
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  printOnePageSummary(report, valid.length, rejects.length, outDir);
}

if (require.main === module) {
  main();
}


