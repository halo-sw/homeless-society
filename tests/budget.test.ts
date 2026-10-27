import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  _resetBudgetChain,
  budgetStatus,
  costUsd,
  maxCallsLimit,
  reconcile,
  recordError,
  reserve,
} from '../server/budget';

let oldEnv: Record<string, string | undefined>;
let dir: string;

beforeEach(async () => {
  oldEnv = { ...process.env };
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hs-budget-'));
  process.env.MUSE_LEDGER_PATH = path.join(dir, 'ledger.json');
  process.env.MUSE_BUDGET_USD = '5';
  delete process.env.MUSE_MAX_CALLS;
  _resetBudgetChain();
});

afterEach(async () => {
  process.env = oldEnv as NodeJS.ProcessEnv;
  await fs.rm(dir, { recursive: true, force: true });
});

describe('ledger', () => {
  it('initializes only on ENOENT', async () => {
    const b = await budgetStatus();
    expect(b.spentUsd).toBe(0);
    expect(b.calls).toBe(0);
  });
  it('fails closed on malformed ledger', async () => {
    await fs.writeFile(process.env.MUSE_LEDGER_PATH as string, 'not-json');
    await expect(budgetStatus()).rejects.toThrow();
    const r = await reserve(0.1);
    expect(r.ok).toBe(false);
  });
  it('rejects a public dist ledger path', async () => {
    process.env.MUSE_LEDGER_PATH = path.join(process.cwd(), 'dist', 'ledger.json');
    const r = await reserve(0.1);
    expect(r.ok).toBe(false);
  });
});

describe('cost', () => {
  it('charges (input-cached)*1.25+cached*0.15+output*4.25 per 1M', () => {
    expect(costUsd(1000000, 0, 0)).toBeCloseTo(1.25, 9);
    expect(costUsd(1000000, 1000000, 0)).toBeCloseTo(0.15, 9);
    expect(costUsd(0, 0, 1000000)).toBeCloseTo(4.25, 9);
    expect(costUsd(1000000, 200000, 500000)).toBeCloseTo(
      ((800000 * 1.25 + 200000 * 0.15 + 500000 * 4.25) / 1e6),
      9,
    );
  });
  it('rejects invalid counts and never allows negative costs', () => {
    expect(() => costUsd(0, 1000000, 0)).toThrow();
    expect(() => costUsd(-1, 0, 0)).toThrow();
    expect(() => costUsd(1.5, 0, 0)).toThrow();
    expect(() => costUsd(NaN, 0, 0)).toThrow();
    expect(() => costUsd(Infinity, 0, 0)).toThrow();
    expect(costUsd(0, 0, 0)).toBe(0);
  });
});

describe('admission', () => {
  it('serializes concurrent reserves under a call cap', async () => {
    process.env.MUSE_MAX_CALLS = '3';
    const rs = await Promise.all([reserve(0.1), reserve(0.1), reserve(0.1), reserve(0.1), reserve(0.1)]);
    expect(rs.filter((r) => r.ok).length).toBe(3);
    expect((await budgetStatus()).calls).toBe(3);
  });
  it('blocks spend over cap and records actual over reserve', async () => {
    const r = await reserve(1.0);
    expect(r.ok).toBe(true);
    await reconcile(1.0, 2.0);
    expect((await budgetStatus()).spentUsd).toBeCloseTo(2.0, 6);
    process.env.MUSE_BUDGET_USD = '2.0';
    expect((await reserve(0.1)).ok).toBe(false);
  });
  it('requires missing budget and valid max calls', async () => {
    delete process.env.MUSE_BUDGET_USD;
    expect((await reserve(0.1)).ok).toBe(false);
    process.env.MUSE_BUDGET_USD = '5';
    process.env.MUSE_MAX_CALLS = '0';
    expect((await reserve(0.1)).ok).toBe(false);
    process.env.MUSE_MAX_CALLS = 'abc';
    expect((await reserve(0.1)).ok).toBe(false);
    expect(() => maxCallsLimit()).toThrow();
  });
  it('counts failed calls', async () => {
    await reserve(0.2);
    await recordError();
    const b = await budgetStatus();
    expect(b.calls).toBe(1);
    expect(b.errors).toBe(1);
  });
});
