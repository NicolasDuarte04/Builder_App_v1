import { access, writeFile, appendFile, mkdir } from 'node:fs/promises';
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

function isServerlessEnvironment(): boolean {
  return (
    process.env.VERCEL === '1' ||
    process.env.NEXT_RUNTIME === 'edge' ||
    process.env.NODE_ENV === 'production'
  );
}

function areFileLogsAllowed(): boolean {
  const forceEnabled = !!process.env.BRIKI_ENABLE_FILE_LOGS;
  return forceEnabled && !isServerlessEnvironment();
}

async function ensureReportsDir(): Promise<string> {
  const outDir = path.join(process.cwd(), 'reports');
  await mkdir(outDir, { recursive: true });
  return outDir;
}

export async function writeReport(event: ThinResultEvent): Promise<void> {
  if (!areFileLogsAllowed()) {
    try {
      console.info(
        '[thin-results] disabled (serverless). count=%d country=%s include=%j',
        event.count,
        event.country || '',
        event.includeCategories || []
      );
    } catch {}
    return;
  }

  const dir = await ensureReportsDir();
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
  try {
    await access(csvPath).then(
      async () => {
        await appendFile(csvPath, csvLine, 'utf8');
      },
      async () => {
        await writeFile(csvPath, csvHeader + csvLine, 'utf8');
      }
    );
  } catch (e) {
    try { console.info('[thin-results] csv write skipped', e); } catch {}
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

  try {
    await access(mdPath).then(
      async () => {
        await appendFile(mdPath, mdSection + '\n', 'utf8');
      },
      async () => {
        const header = `# Thin Results – ${date}\n\n`;
        await writeFile(mdPath, header + mdSection + '\n', 'utf8');
      }
    );
  } catch (e) {
    try { console.info('[thin-results] md write skipped', e); } catch {}
  }
}

export async function initDailyThinResultsFile(): Promise<void> {
  if (!areFileLogsAllowed()) return; // noop in serverless
  const dir = await ensureReportsDir();
  const date = todayStamp();
  const mdPath = path.join(dir, `thin_results_${date}.md`);
  try {
    await access(mdPath).catch(async () => {
      await writeFile(mdPath, `# Thin Results – ${date}\n\n`, 'utf8');
    });
  } catch {}
}


