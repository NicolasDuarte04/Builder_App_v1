import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Pool } from 'pg';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DATABASE_URL = process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL || '';
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const app = Fastify({ logger: true });

app.register(cors, {
  origin: [
    'http://localhost:3000',
    'https://brikiapp.com',
    /https:\/\/.*--briki.*\.vercel\.app$/,
  ],
});

app.register(rateLimit, {
  max: 30,
  timeWindow: '1 minute',
});

app.get('/health', async () => ({ ok: true }));

app.get('/health/db', async () => {
  const start = Date.now();
  await pool.query('SELECT 1');
  return { ok: true, ms: Date.now() - start };
});

type SearchBody = {
  category?: string;
  subcategory?: string;
  text?: string;
  limit?: number;
  offset?: number;
};

app.post<{ Body: SearchBody }>('/plans/search', async (req, reply) => {
  const { category, subcategory, text, limit = 10, offset = 0 } = req.body || {};
  const filters = { category, subcategory, text, limit, offset };
  req.log.info({ filters }, 'search');

  const queryParts: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (category) {
    queryParts.push(`category ILIKE $${idx++}`);
    params.push(`%${category}%`);
  }
  if (subcategory) {
    queryParts.push(`subcategory ILIKE $${idx++}`);
    params.push(`%${subcategory}%`);
  }
  if (text) {
    queryParts.push(`(plan_name_es ILIKE $${idx} OR provider ILIKE $${idx} OR features::text ILIKE $${idx})`);
    params.push(`%${text}%`);
    idx++;
  }

  let where = '1=1';
  if (queryParts.length) where += ' AND ' + queryParts.join(' AND ');

  // Try rich query first
  const baseSelect = `SELECT id, provider, plan_name_es, category, base_price, currency, external_link,
    COALESCE(link_status,'') as link_status, COALESCE(final_url,'') as final_url`;
  const baseFrom = `FROM insurance_plans WHERE ${where}`;
  const sqlRich = `${baseSelect} ${baseFrom} ORDER BY base_price ASC LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(limit, offset);

  try {
    const { rows } = await pool.query(sqlRich, params);
    return { plans: rows, total: rows.length };
  } catch (e: any) {
    req.log.warn({ err: e?.message }, 'rich query failed, falling back');
    const selectCompat = `SELECT id, provider, plan_name_es, category, base_price, currency, external_link,
      '' as link_status, '' as final_url`;
    const sqlCompat = `${selectCompat} ${baseFrom} ORDER BY base_price ASC LIMIT $${idx} OFFSET $${idx + 1}`;
    const { rows } = await pool.query(sqlCompat, params);
    return { plans: rows, total: rows.length };
  }
});

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`briki-api listening on ${address}`);
});
