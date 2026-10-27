import { promises as fs } from 'node:fs';
import path from 'node:path';
export const PRICES = { input: 1.25, cached: 0.15, output: 4.25 };
export const CLI_CEILING_USD = 1.9;
export const DEFAULT_MAX_CALLS = 10;
interface Ledger { spentUsd: number; calls: number; errors: number; }
let chain: Promise<void> = Promise.resolve();
export function _resetBudgetChain(): void { chain = Promise.resolve(); }
export function ledgerPath(): string { return process.env.MUSE_LEDGER_PATH || path.join(process.cwd(), 'data', 'muse-ledger.json'); }
function assertLedgerPathSafe(p: string): void {
  const resolved: string = path.resolve(p);
  const dist: string = path.resolve(process.cwd(), 'dist');
  if (resolved === dist || resolved.startsWith(dist + path.sep)) throw new Error('ledger path must not be under public dist/');
}
export function costUsd(input: number, cached: number, output: number): number {
  const counts: number[] = [input, cached, output];
  for (const n of counts) { if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n < 0) throw new Error('invalid token counts: finite nonnegative integers required'); }
  if (cached > input) throw new Error('invalid token counts: cached exceeds input');
  const v: number = ((input - cached) * PRICES.input + cached * PRICES.cached + output * PRICES.output) / 1e6;
  return Math.max(0, v);
}
function budgetCap(): number {
  const raw = process.env.MUSE_BUDGET_USD;
  if (raw === undefined || raw === null || String(raw).trim() === '') return NaN;
  const n: number = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : NaN;
}
export function maxCallsLimit(): number {
  const raw = process.env.MUSE_MAX_CALLS;
  if (raw === undefined || raw === null || String(raw).trim() === '') return DEFAULT_MAX_CALLS;
  const s: string = String(raw).trim();
  if (!/^\d+$/.test(s)) throw new Error('MUSE_MAX_CALLS must be a positive integer');
  const n: number = Number(s);
  if (!Number.isSafeInteger(n) || n <= 0 || n > 100000) throw new Error('MUSE_MAX_CALLS must be a positive integer');
  return n;
}
function validateLedger(v: unknown): Ledger {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('ledger corrupt: not an object');
  const l = v as Record<string, unknown>;
  const spentUsd: unknown = l.spentUsd; const calls: unknown = l.calls; const errors: unknown = l.errors;
  if (typeof spentUsd !== 'number' || !Number.isFinite(spentUsd) || spentUsd < 0 || spentUsd > 1e9) throw new Error('ledger corrupt: spentUsd');
  if (!Number.isInteger(calls) || (calls as number) < 0 || (calls as number) > 1000000) throw new Error('ledger corrupt: calls');
  if (!Number.isInteger(errors) || (errors as number) < 0 || (errors as number) > 1000000) throw new Error('ledger corrupt: errors');
  return { spentUsd: spentUsd as number, calls: calls as number, errors: errors as number };
}
async function readLedger(): Promise<Ledger> {
  const p: string = ledgerPath();
  assertLedgerPathSafe(p);
  let raw: string;
  try { raw = await fs.readFile(p, 'utf8'); } catch (e) { const err = e as NodeJS.ErrnoException; if (err && err.code === 'ENOENT') return { spentUsd: 0, calls: 0, errors: 0 }; throw new Error('ledger unreadable (fail closed)'); }
  try { return validateLedger(JSON.parse(raw)); } catch { throw new Error('ledger corrupt: unparsable or invalid (fail closed)'); }
}
async function writeLedgerAtomic(l: Ledger): Promise<void> {
  const p: string = ledgerPath();
  assertLedgerPathSafe(p);
  await fs.mkdir(path.dirname(p), { recursive: true });
  const tmp: string = p + '.' + process.pid + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(l), { mode: 0o600 });
  await fs.rename(tmp, p);
}
export async function budgetStatus(): Promise<Ledger & { cap: number; maxCalls: number }> {
  const l: Ledger = await readLedger();
  const cap: number = budgetCap();
  return { ...l, cap: Number.isFinite(cap) ? cap : 0, maxCalls: maxCallsLimit() };
}
export function reserve(estimate: number): Promise<{ ok: boolean; error?: string }> {
  const run = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!Number.isFinite(estimate) || estimate <= 0) return { ok: false, error: 'invalid estimate' };
    const cap: number = budgetCap();
    if (!Number.isFinite(cap)) return { ok: false, error: 'MUSE_BUDGET_USD is not set. Please set a positive budget in the server .env.' };
    let maxCalls: number;
    try { maxCalls = maxCallsLimit(); } catch { return { ok: false, error: 'MUSE_MAX_CALLS is invalid. Set a positive integer.' }; }
    let l: Ledger;
    try { l = await readLedger(); } catch { return { ok: false, error: 'Budget ledger is damaged, so calls are stopped. (fail closed)' }; }
    if (l.calls + 1 > maxCalls) return { ok: false, error: 'Maximum call count exceeded. (' + l.calls + '/' + maxCalls + ')' };
    if (l.spentUsd + estimate > cap) return { ok: false, error: 'Stopped: budget cap exceeded. (used ' + l.spentUsd.toFixed(4) + '/' + cap + ' USD)' };
    l.spentUsd = Math.round((l.spentUsd + estimate) * 1e6) / 1e6;
    l.calls += 1;
    try { await writeLedgerAtomic(l); } catch { return { ok: false, error: 'Budget ledger save failed, so calls are stopped.' }; }
    return { ok: true };
  };
  const p: Promise<{ ok: boolean; error?: string }> = chain.then(run);
  chain = p.then(() => undefined, () => undefined);
  return p;
}
export function reconcile(estimate: number, actual: number): Promise<void> {
  const run = async (): Promise<void> => {
    if (!Number.isFinite(estimate) || estimate < 0 || !Number.isFinite(actual) || actual < 0) throw new Error('invalid reconcile amounts');
    const l: Ledger = await readLedger();
    l.spentUsd = Math.max(0, Math.round((l.spentUsd - estimate + actual) * 1e6) / 1e6);
    await writeLedgerAtomic(l);
  };
  const p: Promise<void> = chain.then(run);
  chain = p.then(() => undefined, () => undefined);
  return p;
}
export function recordError(): Promise<void> {
  const run = async (): Promise<void> => {
    const l: Ledger = await readLedger();
    l.errors += 1;
    await writeLedgerAtomic(l);
  };
  const p: Promise<void> = chain.then(run);
  chain = p.then(() => undefined, () => undefined);
  return p;
}
