import { existsSync } from 'node:fs';
try {
  if (existsSync('.env')) process.loadEnvFile('.env');
} catch {
  /* .env is optional */
}
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { budgetStatus } from './budget.js';
import { MODEL, planQuestions } from './muse.js';
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
  if (arr.length > 10) { res.status(429).json({ error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' }); return; }
  next();
}
function sanitizeError(e: unknown): string {
  const m: unknown = (e as { message?: unknown }).message;
  if (typeof m !== 'string' || !m) return '서버 오류';
  if (/MUSE_BUDGET_USD|MODEL_API_KEY|MUSE_BIN|ledger|ENOENT|\.env/i.test(m)) return m.slice(0, 300);
  return m.slice(0, 300).replace(/\/[\w\-.\/]+\.(ts|js|json)/g, '[file]');
}
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/muse/status', async (_req, res) => {
  let b: Awaited<ReturnType<typeof budgetStatus>>;
  try { b = await budgetStatus(); } catch { res.status(500).json({ error: '예산 원장 오류' }); return; }
  const hasCred: boolean = !!(process.env.MODEL_API_KEY || process.env.MUSE_BIN);
  const capOk: boolean = b.cap > 0;
  if (!hasCred || !capOk) { res.json({ aiReady: false, note: 'AI 연결 전: MODEL_API_KEY 또는 MUSE_BIN과 MUSE_BUDGET_USD 설정 필요', spentUsd: b.spentUsd, calls: b.calls, cap: b.cap }); return; }
  res.json({ aiReady: true, note: 'Muse 구성됨 · 연결 미테스트 (첫 호출에서 ' + MODEL + ' 검증)', spentUsd: b.spentUsd, calls: b.calls, cap: b.cap });
});
app.post('/api/geocode', rateLimit, async (req, res) => {
  const q: string = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
  if (!q || q.length > 200) { res.status(400).json({ error: '주소를 입력해 주세요.' }); return; }
  const key: string = process.env.KAKAO_REST_API_KEY || '';
  if (!key) { res.status(501).json({ error: '주소 검색 키 없음', manual: true }); return; }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch('https://dapi.kakao.com/v2/local/search/address.json?query=' + encodeURIComponent(q), { headers: { Authorization: 'KakaoAK ' + key }, signal: ctl.signal });
    if (!r.ok) { res.status(502).json({ error: '주소 검색 실패' }); return; }
    const j = (await r.json()) as { documents?: { address_name?: unknown; x?: unknown; y?: unknown }[] };
    const results = (Array.isArray(j.documents) ? j.documents : []).slice(0, 5).map((d) => ({ address: String(d.address_name || ''), lng: Number(d.x), lat: Number(d.y) })).filter((d) => d.address && Number.isFinite(d.lat) && Number.isFinite(d.lng) && d.lat >= -90 && d.lat <= 90 && d.lng >= -180 && d.lng <= 180);
    res.json({ results });
  } catch { res.status(502).json({ error: '주소 검색 중 오류' }); } finally { clearTimeout(t); }
});
app.post('/api/muse/questions', rateLimit, async (req, res) => {
  try { const out = await planQuestions(req.body); res.json(out); }
  catch (e) { const err = e as { status?: number }; res.status(typeof err.status === 'number' ? err.status : 500).json({ error: sanitizeError(e) }); }
});
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'), (e) => { if (e) res.status(404).end(); }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) { next(err); return; }
  if (err && (err.type === 'entity.too.large' || err.status === 413)) { res.status(413).json({ error: '요청 크기가 제한을 초과했습니다.' }); return; }
  if (err instanceof SyntaxError) { res.status(400).json({ error: 'JSON 형식이 올바르지 않습니다.' }); return; }
  next(err);
});
const port: number = Number(process.env.PORT) || 3001;
if (process.env.NODE_ENV !== 'test') app.listen(port, '127.0.0.1', () => console.log('api on 127.0.0.1:' + port));
export default app;
