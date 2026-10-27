import { describe, expect, it, vi } from 'vitest';
import { commuteHoursPerMonth, monthlyPaymentM, price10kToMillion, priceCurve, savedHoursPerMonth } from '../src/domain/housing';
import { handleHousingQuery } from '../server/housing';
import { emptySession, validateImport, validateScenarioInput, validateHousing } from '../src/domain/session';
describe('loan arithmetic', () => {
  it('handles zero loan and zero rate', () => {
    expect(monthlyPaymentM(0, 4, 30)).toBe(0);
    expect(monthlyPaymentM(655, 0, 30)).toBeCloseTo(655 / 360, 9);
  });
  it('charges positive interest above the zero-rate baseline', () => {
    const zero = monthlyPaymentM(655, 0, 30);
    const pos = monthlyPaymentM(655, 4, 30);
    expect(pos).toBeGreaterThan(zero);
    expect(pos).toBeCloseTo(3.135, 1);
  });
});
describe('scenario timing', () => {
  it('saves no time before the opening year', () => {
    expect(savedHoursPerMonth(10, 21, false)).toBe(0);
    expect(savedHoursPerMonth(10, 21, true)).toBeCloseTo(7, 6);
    expect(commuteHoursPerMonth(45, 21)).toBeCloseTo(31.5, 6);
  });
  it('builds an illustrative curve from the user growth assumption', () => {
    expect(priceCurve(855, 0, 2)).toEqual([855, 855, 855]);
    expect(priceCurve(100, 5, 1)[1]).toBeCloseTo(105, 6);
  });
});
describe('10k units', () => {
  it('converts 85500 to 855 million', () => {
    expect(price10kToMillion(85500)).toBe(855);
  });
});
describe('housing api validation', () => {
  it('rejects malformed queries without upstream calls', async () => {
    const f = vi.fn(async () => new Response('{}'));
    const bad = await handleHousingQuery({ kind: 'trades', lawd_cd: 'abc', deal_ymd: '2026', asset: 'apartment' }, f as unknown as typeof fetch);
    expect(bad.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
    const badKind = await handleHousingQuery({ kind: 'nope' }, f as unknown as typeof fetch);
    expect(badKind.status).toBe(400);
  });
  it('normalizes a bounded trades sample', async () => {
    const upstream = { items: [{ name: 'Apt', district: 'a', area_m2: 49.97, floor: 19, price_10k: 85500, deal_date: '2026-09-21', build_year: 2005, deal_type: 'type' }], summary: {}, query: {}, proxy: {} };
    const f = async () => new Response(JSON.stringify(upstream), { status: 200 });
    const out = await handleHousingQuery({ kind: 'trades', lawd_cd: '11440', deal_ymd: '202609', asset: 'apartment' }, f as unknown as typeof fetch);
    expect(out.status).toBe(200);
    const body = out.body as { items: { price_10k: number }[]; summary: { sample_count: number } };
    expect(body.items[0].price_10k).toBe(85500);
    expect(body.summary.sample_count).toBe(1);
  });
  it('computes an even median as the mean of two middles', async () => {
    const upstream = { items: [{ name: 'A', district: 'd', area_m2: 50, floor: 5, price_10k: 40000, deal_date: '2026-09-01', build_year: 2000, deal_type: 't' }, { name: 'B', district: 'd', area_m2: 50, floor: 5, price_10k: 60000, deal_date: '2026-09-02', build_year: 2000, deal_type: 't' }], summary: {}, query: {}, proxy: {} };
    const f = async () => new Response(JSON.stringify(upstream), { status: 200 });
    const out = await handleHousingQuery({ kind: 'trades', lawd_cd: '11440', deal_ymd: '202609', asset: 'apartment' }, f as unknown as typeof fetch);
    const body = out.body as { summary: { median_price_10k: number } };
    expect(body.summary.median_price_10k).toBe(50000);
  });
  it('rejects mismatched region metadata and negative numerics', async () => {
    const upstream = { items: [], query: { lawd_cd: '99999' }, summary: {} };
    const f = async () => new Response(JSON.stringify(upstream), { status: 200 });
    const out = await handleHousingQuery({ kind: 'trades', lawd_cd: '11440', deal_ymd: '202609', asset: 'apartment' }, f as unknown as typeof fetch);
    expect(out.status).toBe(502);
    expect(validateScenarioInput({ priceM: -5, cashM: 0, annualRate: 4, termYears: 30, monthlyFees: 0, commuteMin: 10, workdays: 21, yearsAhead: 5, childAge: null, improveMin: 5, openingYear: null, growthPct: 0, newSupply: false, transitTheme: false }).ok).toBe(false);
  });
});
describe('housing import bounds', () => {
  it('accepts old schema without housing and rejects oversized trades', () => {
    const s = emptySession();
    const noHousing = { ...s } as Record<string, unknown>;
    delete noHousing.housing;
    expect(validateImport(noHousing).ok).toBe(true);
    const big = emptySession();
    big.housing!.trades = { items: Array.from({ length: 21 }, (_, i) => ({ name: 'A' + i, district: 'd', area_m2: 50, floor: 5, price_10k: 50000, deal_date: '2026-09-01', build_year: 2000, deal_type: 't' })), sample_count: 21, median_price_10k: 50000, min_price_10k: 50000, max_price_10k: 50000, deal_ymd: '202609', asset: 'apartment', lawd_cd: '11440', fetchedAt: new Date().toISOString(), source: 'x' };
    expect(validateImport(big).ok).toBe(false);
  });
  it('persists region and month through export shape', () => {
    const s = emptySession();
    s.housing!.region = { lawd_cd: '11440', name: 'Seoul Mapo', query: 'mapo' };
    s.housing!.month = '202609';
    const r = validateImport(JSON.parse(JSON.stringify(s)));
    expect(r.ok).toBe(true);
    expect(r.session?.housing?.region?.lawd_cd).toBe('11440');
    expect(r.session?.housing?.month).toBe('202609');
  });
  it('rejects orphan home ids and isolates per-home drafts', () => {
    const s = emptySession();
    s.candidates = [{ id: 'live-a', nickname: 'Top', address: '1 Road', source: 'user-confirmed', coords: null, confirmed: true }];
    s.activeCandidateId = 'live-a';
    s.housing!.scenarios = [{ id: 'sc-1', homeId: 'ghost', input: { priceM: 100, cashM: 10, annualRate: 4, termYears: 30, monthlyFees: 1, commuteMin: 20, workdays: 21, yearsAhead: 5, childAge: null, improveMin: 5, openingYear: null, growthPct: 0, newSupply: false, transitTheme: false }, createdAt: new Date().toISOString(), label: 'x' }];
    expect(validateImport(JSON.parse(JSON.stringify(s))).ok).toBe(false);
    const ok = emptySession();
    ok.candidates = [{ id: 'live-a', nickname: 'Top', address: '1 Road', source: 'user-confirmed', coords: null, confirmed: true }];
    ok.activeCandidateId = 'live-a';
    ok.housing!.scenarioDrafts = { 'live-a': { priceM: 900, cashM: 100, annualRate: 4, termYears: 30, monthlyFees: 1, commuteMin: 20, workdays: 21, yearsAhead: 5, childAge: null, improveMin: 5, openingYear: null, growthPct: 0, newSupply: false, transitTheme: false } };
    expect(validateImport(JSON.parse(JSON.stringify(ok))).ok).toBe(true);
    expect(validateHousing({ ...ok.housing, homeFactors: { 'live-a': [{ id: 'commute', weight: 1, note: '', evidence: 'linked-source', sourceUrl: '', sourceDate: null }] } }).ok).toBe(false);
  });
});
