import { describe, expect, it } from 'vitest';
import { validateModelOutput, validateSessionBody } from '../server/sessionValidate';
function liveBase() {
  return { version: 1, mode: 'live', candidates: [{ id: 'c1', nickname: 'No.1', address: 'Mapo, Seoul', source: 'user-confirmed', coords: null, confirmed: true }], activeCandidateId: 'c1', activeStopId: 'around', priorities: ['Commute'], initialQuestions: 'What is the maintenance fee?', observations: [{ id: 'ob-1', candidateId: 'c1', stopId: 'around', text: 'quiet at noon', question: 'Is it quiet at night too?', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '2026-10-01T00:00:00.000Z' }], visitNotes: '', visitMemos: [{ id: 'm-1', candidateId: 'c1', text: 'visited at night', date: '2026-10-02', updatedAt: '2026-10-02T00:00:00.000Z' }], changeLog: [{ at: '2026-10-02T00:00:00.000Z', note: 'confirmed' }], complete: false, updatedAt: '2026-10-02T00:00:00.000Z' };
}
function demoBase() {
  return { version: 1, mode: 'demo', candidates: [{ id: 'demo-a', nickname: 'Sunlit House', address: 'Solan Village (fictional) Sunlit Lane 1', source: 'demo', coords: null, confirmed: true }, { id: 'demo-b', nickname: 'Moonlight House', address: 'Solan Village (fictional) Moonlight Lane 2', source: 'demo', coords: null, confirmed: true }], activeCandidateId: 'demo-a', activeStopId: 'around', priorities: ['Commute', 'Evening walk'], initialQuestions: 'fictional question', observations: [], visitNotes: '', visitMemos: [], changeLog: [], complete: false, updatedAt: '2026-10-02T00:00:00.000Z' };
}
describe('session body (real Session schema)', () => {
  it('accepts demo and live bodies and strips unknown fields', () => {
    const live = validateSessionBody({ ...liveBase(), extra: 1, candidates: [{ ...liveBase().candidates[0], unknown: true }] });
    expect(live.ok).toBe(true);
    expect((live.session as unknown as Record<string, unknown>).extra).toBeUndefined();
    expect(validateSessionBody(demoBase()).ok).toBe(true);
  });
  it('migrates legacy Korean priorities', () => {
    expect(validateSessionBody({ ...liveBase(), priorities: ['\ud1b5\uadfc \ub3d9\uc120'] }).ok).toBe(true);
    const v = validateSessionBody({ ...liveBase(), priorities: ['\ud1b5\uadfc \ub3d9\uc120'] });
    expect(v.session?.priorities).toEqual(['Commute']);
  });
  it('accepts a valid simulation field and rejects nonfinite or non-boolean simulation', () => {
    expect(validateSessionBody({ ...liveBase(), simulation: { hour: 21, streetLights: true, showRoute: true, traffic: 1, camAngle: 10, camZoom: 1.2, walkStep: 1, playing: false } }).ok).toBe(true);
    expect(validateSessionBody({ ...liveBase(), simulation: { hour: Infinity, streetLights: true, showRoute: true, traffic: 1, camAngle: 0, camZoom: 1, walkStep: 0, playing: false } }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), simulation: { hour: 10, streetLights: 1, showRoute: true, traffic: 1, camAngle: 0, camZoom: 1, walkStep: 0, playing: false } }).ok).toBe(false);
  });
  it('rejects candidate, observation, priority and id problems', () => {
    expect(validateSessionBody({ ...liveBase(), candidates: [{ ...liveBase().candidates[0] }, { ...liveBase().candidates[0] }] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), candidates: [{ id: '', nickname: 'n', address: 'a', source: 'user-confirmed', coords: null, confirmed: true }] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), activeCandidateId: 'foreign' }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), priorities: ['Commute', 'Groceries', 'Evening walk', 'Building access'] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), priorities: ['nope'] }).ok).toBe(false);
  });
  it('rejects bad dates, urls, mode mixing and changeLog problems', () => {
    expect(validateSessionBody({ ...liveBase(), observations: [{ id: 'ob-1', candidateId: 'c1', stopId: 'around', text: 'x', question: '', sourceType: 'user', sourceUrl: 'https://user:pass@example.com', sourceDate: null, resolved: false, updatedAt: '' }] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), mode: 'live', candidates: [{ id: 'c1', nickname: 'n', address: 'a', source: 'demo', coords: null, confirmed: true }] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), changeLog: [{ at: 'bad', note: '' }] }).ok).toBe(false);
  });
  it('validates strict types without crashing on nulls', () => {
    expect(validateSessionBody(null).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), complete: 'yes' as unknown as boolean }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), complete: true }).ok).toBe(true);
  });
});
describe('model output', () => {
  it('rejects questions with unknown ids instead of stripping', () => {
    const v = validateModelOutput({ questions: [{ text: 'Could you check?', reason: 'r', evidenceIds: ['ob-1', 'foreign'] }] }, ['ob-1']);
    expect(v.questions).toEqual([]);
  });
  it('requires ? endings and arrays', () => {
    expect(validateModelOutput({ questions: [{ text: 'Ends with period.', reason: '', evidenceIds: [] }] }, []).questions).toEqual([]);
    expect(validateModelOutput({ nope: 1 }, []).questions).toEqual([]);
  });
  it('scans past invalid items to collect up to 3 valid', () => {
    const v = validateModelOutput({ questions: [{ text: 'Foreign evidence?', reason: 'x', evidenceIds: ['foreign'] }, { text: 'Ends with period.', reason: 'x', evidenceIds: [] }, { text: 'First check?', reason: 'a', evidenceIds: [] }, { text: 'Second check?', reason: 'b', evidenceIds: [] }, { text: 'Third check?', reason: 'c', evidenceIds: [] }, { text: 'Fourth check?', reason: 'd', evidenceIds: [] }] }, []);
    expect(v.questions.map((q) => q.text)).toEqual(['First check?', 'Second check?', 'Third check?']);
  });
});
