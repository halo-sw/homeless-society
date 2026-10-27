import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { _resetBudgetChain } from '../server/budget';
import app from '../server/server';
let oldEnv: Record<string, string | undefined>;
let dir: string;
let server: Server | null = null;
let url = '';
function liveSession() {
  return { version: 1, mode: 'live', candidates: [{ id: 'c1', nickname: 'No.1', address: 'Mapo, Seoul', source: 'user-confirmed', coords: null, confirmed: true }], activeCandidateId: 'c1', activeStopId: 'around', priorities: ['Commute'], initialQuestions: 'How far is the station?', observations: [], visitNotes: '', visitMemos: [], changeLog: [], complete: false, updatedAt: '2026-10-02T00:00:00.000Z' };
}
beforeEach(async () => {
  oldEnv = { ...process.env };
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hs-server-'));
  process.env.MUSE_LEDGER_PATH = path.join(dir, 'ledger.json');
  delete process.env.MODEL_API_KEY; delete process.env.MUSE_BIN; delete process.env.MUSE_BUDGET_USD; delete process.env.KAKAO_REST_API_KEY;
  process.env.NODE_ENV = 'test';
  _resetBudgetChain();
  server = await new Promise<Server>((resolve, reject) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); s.on('error', reject); });
  const port: number = (server.address() as AddressInfo).port;
  url = 'http://127.0.0.1:' + port;
});
afterEach(async () => {
  if (server) { await new Promise<void>((resolve) => { const t = setTimeout(resolve, 2000); (t as unknown as { unref?: () => void }).unref?.(); server?.close(() => { clearTimeout(t); resolve(); }); }); server = null; }
  process.env = oldEnv as NodeJS.ProcessEnv;
  await fs.rm(dir, { recursive: true, force: true });
});
describe('server', () => {
  it('reports health and unconfigured AI without secrets', async () => {
    const h = (await (await fetch(url + '/api/health')).json()) as { ok: boolean };
    expect(h.ok).toBe(true);
    const s = (await (await fetch(url + '/api/muse/status')).json()) as { aiReady: boolean; note: string };
    expect(s.aiReady).toBe(false);
    expect(s.note).toMatch(/Before AI connection/);
  });
  it('says configured but untested when credentials and budget exist', async () => {
    process.env.MODEL_API_KEY = 'k';
    process.env.MUSE_BUDGET_USD = '3';
    const s = (await (await fetch(url + '/api/muse/status')).json()) as { aiReady: boolean; note: string };
    expect(s.aiReady).toBe(true);
    expect(s.note).toMatch(/untested/);
  });
  it('answers invalid JSON and bad sessions friendly', async () => {
    const bad = await fetch(url + '/api/muse/questions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
    expect(bad.status).toBe(400);
    const invalid = await fetch(url + '/api/muse/questions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: null }) });
    expect(invalid.status).toBe(400);
  });
  it('returns a labelled local template when keyless', async () => {
    const r = await fetch(url + '/api/muse/questions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: liveSession() }) });
    const j = (await r.json()) as { mock: boolean; model: string; questions: { evidenceIds: string[] }[] };
    expect(r.status).toBe(200);
    expect(j.mock).toBe(true);
    expect(j.questions[0].evidenceIds).toEqual([]);
  });
  it('rejects oversized bodies with friendly JSON', async () => {
    const big: string = 'x'.repeat(400 * 1024);
    const r = await fetch(url + '/api/muse/questions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: liveSession(), pad: big }) });
    expect([400, 413]).toContain(r.status);
  });
  it('validates geocode input', async () => {
    const empty = await fetch(url + '/api/geocode', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '' }) });
    expect(empty.status).toBe(400);
    const noKey = await fetch(url + '/api/geocode', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'Seoul' }) });
    expect(noKey.status).toBe(501);
  });
});
