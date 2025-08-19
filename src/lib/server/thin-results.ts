import path from 'node:path';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';

function isServerlessEnvironment(): boolean {
  return (
    process.env.VERCEL === '1' ||
    process.env.NEXT_RUNTIME === 'edge' ||
    process.env.NODE_ENV === 'production'
  );
}

export function areFileLogsAllowed(): boolean {
  const forceEnabled = !!process.env.BRIKI_ENABLE_FILE_LOGS;
  return forceEnabled && !isServerlessEnvironment();
}

async function ensureReportsDir(): Promise<string> {
  const dir = path.join(process.cwd(), 'reports');
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeThinResults(filename: string, text: string, append: boolean = true): Promise<void> {
  if (!areFileLogsAllowed()) {
    try {
      console.info('[thin-results] disabled (serverless)');
    } catch {}
    return;
  }
  try {
    const dir = await ensureReportsDir();
    const filePath = path.join(dir, filename);
    if (append) {
      await appendFile(filePath, text, 'utf8');
    } else {
      await writeFile(filePath, text, 'utf8');
    }
  } catch (e) {
    try {
      console.info('[thin-results] write skipped', e);
    } catch {}
  }
}


