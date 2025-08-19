import fs from 'node:fs';
import path from 'node:path';

type ThinResultEvent = {
  timestamp: string; // ISO
  domain: string;
  datasource: string | null;
  country?: string;
  includeCategories?: string[];
  excludeCategories?: string[];
  tags?: string[];
  benefitsContain?: string;
  count: number;
  durationMs: number;
  requestId: string;
};

function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function ensureReportsDir(): string {
  const outDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

export async function writeReport(event: ThinResultEvent): Promise<void> {
  const dir = ensureReportsDir();
  const date = todayStamp();
  const csvPath = path.join(dir, `thin_results_${date}.csv`);
  const mdPath = path.join(dir, `thin_results_${date}.md`);

  const csvHeader = 'timestamp,domain,datasource,country,includeCategories,excludeCategories,tags,benefitsContain,count,durationMs,requestId\n';
  const csvLine = [
    event.timestamp,
    event.domain,
    event.datasource ?? '',
    event.country ?? '',
    (event.includeCategories || []).join('|'),
    (event.excludeCategories || []).join('|'),
    (event.tags || []).join('|'),
    event.benefitsContain ?? '',
    String(event.count),
    String(Math.max(0, Math.round(event.durationMs))),
    event.requestId,
  ]
    .map((cell) => {
      const s = String(cell);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    })
    .join(',') + '\n';

  // CSV append with header if missing
  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, csvHeader + csvLine, 'utf8');
  } else {
    fs.appendFileSync(csvPath, csvLine, 'utf8');
  }

  // MD rollup append (short section)
  const mdSection = [
    `\n### Thin Result @ ${event.timestamp} (${event.requestId})`,
    '',
    `- domain: ${event.domain}`,
    `- datasource: ${event.datasource ?? ''}`,
    `- country: ${event.country ?? ''}`,
    `- include: ${(event.includeCategories || []).join(', ')}`,
    `- exclude: ${(event.excludeCategories || []).join(', ')}`,
    `- tags: ${(event.tags || []).join(', ')}`,
    `- benefitsContain: ${event.benefitsContain ?? ''}`,
    `- count: ${event.count}`,
    `- durationMs: ${Math.max(0, Math.round(event.durationMs))}`,
    ''
  ].join('\n');

  if (!fs.existsSync(mdPath)) {
    const header = `# Thin Results – ${date}\n\n`;
    fs.writeFileSync(mdPath, header + mdSection + '\n', 'utf8');
  } else {
    fs.appendFileSync(mdPath, mdSection + '\n', 'utf8');
  }
}

export async function initDailyThinResultsFile(): Promise<void> {
  const dir = ensureReportsDir();
  const date = todayStamp();
  const mdPath = path.join(dir, `thin_results_${date}.md`);
  if (!fs.existsSync(mdPath)) {
    fs.writeFileSync(mdPath, `# Thin Results – ${date}\n\n`, 'utf8');
  }
}


