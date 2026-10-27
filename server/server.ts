import { existsSync } from 'node:fs';
try { if (existsSync('.env')) process.loadEnvFile('.env'); } catch { }
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { budgetStatus } from './budget.js';
import { MODEL, planQuestions } from './muse.js';
import { handleHousingQuery } from './housing.js';
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '300kb' }));
const here: string = path.dirname(fileURLToPath(import.meta.url));
const dist: string = path.join(here, '..', 'dist');
const hits = new Map<string, number[]>();
const MAX_IPS = 500;
function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const now: number = Date.now();
  const key: string = req.ip || '?';
  const arr: number[] = (hits.get(key) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > MAX_IPS) { const first = hits.keys().next(); if (!first.done) hits.delete(first.value); }
  if (arr.length > 10) { res.status(429).json({ error: 'Too many requests. Please wait and retry.' }); return; }
  next();
}
function sanitizeError(e: unknown): string {
  const m: unknown = (e as { message?: unknown }).message;
  if (typeof m !== 'string' || !m) return 'Server error';
  if (/MUSE_BUDGET_USD|MODEL_API_KEY|MUSE_BIN|ledger|ENOENT|\.env/i.test(m)) return m.slice(0, 300);
  return m.slice(0, 300).replace(/\/[\w\-.\/]+\.(ts|js|json)/g, '[file]');
}
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/housing', rateLimit, async (req, res) => {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.query ?? {})) flat[k] = Array.isArray(v) ? String(v[0]) : String(v as unknown);
  const out = await handleHousingQuery(flat);
  if (out.cacheable) res.setHeader('Cache-Control', 'public, s-maxage=300, max-age=60');
  else res.setHeader('Cache-Control', 'no-store');
  res.status(out.status).json(out.body);
});
app.get('/api/muse/status', async (_req, res) => {
  let b: Awaited<ReturnType<typeof budgetStatus>>;
  try { b = await budgetStatus(); } catch { res.status(500).json({ error: 'Budget ledger error' }); return; }
  const hasCred: boolean = !!(process.env.MODEL_API_KEY || process.env.MUSE_BIN);
  const capOk: boolean = b.cap > 0;
  if (!hasCred || !capOk) { res.json({ aiReady: false, note: 'Before AI connection: set MODEL_API_KEY or MUSE_BIN plus MUSE_BUDGET_USD', spentUsd: b.spentUsd, calls: b.calls, cap: b.cap }); return; }
  res.json({ aiReady: true, note: 'Muse configured · connection untested (first call verifies ' + MODEL + ')', spentUsd: b.spentUsd, calls: b.calls, cap: b.cap });
});
app.post('/api/geocode', rateLimit, async (req, res) => {
  const q: string = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
  if (!q || q.length > 200) { res.status(400).json({ error: 'Please enter an address.' }); return; }
  const key: string = process.env.KAKAO_REST_API_KEY || '';
  if (!key) { res.status(501).json({ error: 'No address-search key', manual: true }); return; }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch('https://dapi.kakao.com/v2/local/search/address.json?query=' + encodeURIComponent(q), { headers: { Authorization: 'KakaoAK ' + key }, signal: ctl.signal });
    if (!r.ok) { res.status(502).json({ error: 'Address search failed' }); return; }
    const j = (await r.json()) as { documents?: { address_name?: unknown; x?: unknown; y?: unknown }[] };
    const results = (Array.isArray(j.documents) ? j.documents : []).slice(0, 5).map((d) => ({ address: String(d.address_name || ''), lng: Number(d.x), lat: Number(d.y) })).filter((d) => d.address && Number.isFinite(d.lat) && Number.isFinite(d.lng) && d.lat >= -90 && d.lat <= 90 && d.lng >= -180 && d.lng <= 180);
    res.json({ results });
  } catch { res.status(502).json({ error: 'Address search error' }); } finally { clearTimeout(t); }
});
app.post('/api/muse/questions', rateLimit, async (req, res) => {
  try { const out = await planQuestions(req.body); res.json(out); }
  catch (e) { const err = e as { status?: number }; res.status(typeof err.status === 'number' ? err.status : 500).json({ error: sanitizeError(e) }); }
});
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'), (e) => { if (e) res.status(404).end(); }));
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  const e = err as { type?: string; status?: number };
  if (res.headersSent) { next(err); return; }
  if (e && (e.type === 'entity.too.large' || e.status === 413)) { res.status(413).json({ error: 'Request exceeds the size limit.' }); return; }
  if (err instanceof SyntaxError) { res.status(400).json({ error: 'Malformed JSON.' }); return; }
  next(err);
});
const port: number = Number(process.env.PORT) || 3001;
if (process.env.NODE_ENV !== 'test') app.listen(port, '127.0.0.1', () => console.log('api on 127.0.0.1:' + port));
export default app;
