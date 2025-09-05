#!/usr/bin/env tsx

import { sql } from '@/lib/db/client';

function parseArgs(argv: string[]) {
  const args: any = {};
  for (const a of argv) {
    const [k, v] = a.startsWith('--') ? a.slice(2).split('=') : [null, null];
    if (k) args[k] = v ?? true;
  }
  if (!args['category'] || !args['country'] || !args['batch-id']) {
    throw new Error('Usage: tsx scripts/commit-staged-batch.ts --category auto --country CO --batch-id 20250902-CO-auto');
  }
  return args as { category: string; country: string; ['batch-id']: string };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // Call commit function; expect it to return inserted/updated
  const res = await sql<{ inserted: number; updated: number }>(`SELECT * FROM public.plans_stage_commit($1)`, [args['batch-id']]);
  const row = res.rows[0] || { inserted: 0, updated: 0 };
  const out = { batchId: args['batch-id'], ...row };
  const fs = await import('fs');
  const path = await import('path');
  const outPath = path.join(process.cwd(), 'data', 'audit', 'auto_CO_commit_result.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(outPath);
}

main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });


