import { describe, expect, it } from 'vitest';
import { byteSize, canEnterStage, containsBannedClaim, emptySession, hasConfirmedCandidate, isValidDateString, isValidHttpUrl, observationsFor, openQuestions, startDemoSession, startLiveSession, summarize, togglePriorityWithLimit, validateImport, validUrl, type Session } from '../src/domain/session';
function base(): Session {
  const s: Session = emptySession();
  s.mode = 'demo';
  s.candidates = [{ id: 'demo-a', nickname: 'Sunlit House', address: 'fictional', source: 'demo', coords: null, confirmed: true }];
  s.activeCandidateId = 'demo-a';
  return s;
}
describe('session state', () => {
  it('filters observations per candidate and stop without mixing', () => {
    const s: Session = base();
    s.observations = [
      { id: 'ob-1', candidateId: 'demo-a', stopId: 'around', text: 'bright', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
      { id: 'ob-2', candidateId: 'demo-b', stopId: 'around', text: 'dark', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' }
    ];
    expect(observationsFor(s, 'demo-a', 'around').map((o) => o.id)).toEqual(['ob-1']);
  });
  it('recomputes summary after deletion', () => {
    const s: Session = base();
    s.observations = [{ id: 'ob-1', candidateId: 'demo-a', stopId: 'around', text: 'bright', question: 'bright?', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: true, updatedAt: '' }];
    expect(summarize(s).learned).toEqual(['bright']);
    s.observations = [];
    expect(summarize(s).learned).toEqual([]);
  });
  it('keeps unknown dates and prioritizes open questions', () => {
    const s: Session = base();
    s.observations = [1, 2, 3, 4].map((i) => ({ id: 'ob-' + i, candidateId: 'demo-a', stopId: 'around' as const, text: 't' + i, question: 'q' + i, sourceType: 'user' as const, sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' }));
    expect(openQuestions(s).length).toBe(3);
    expect(s.observations[0].sourceDate).toBeNull();
  });
  it('rejects malformed, old-version and oversized imports', () => {
    expect(validateImport('{oops').ok).toBe(false);
    expect(validateImport({ version: 0 }).ok).toBe(false);
    const s: Session = base();
    s.candidates.push({ id: 'x', nickname: 'x', address: 'x', source: 'demo', coords: null, confirmed: true });
    s.candidates.push({ id: 'y', nickname: 'y', address: 'y', source: 'demo', coords: null, confirmed: true });
    expect(validateImport(s).ok).toBe(false);
  });
  it('requires http(s) source urls', () => {
    expect(validUrl('ftp://evil')).toBe(false);
    expect(validUrl('https://example.com/x')).toBe(true);
  });
  it('flags guarantee phrasing', () => {
    expect(containsBannedClaim('this home is guaranteed safe')).toBe(true);
    expect(containsBannedClaim('check the night brightness')).toBe(false);
  });
  it('rejects foreign ids, credentials urls, bad dates and duplicates', () => {
    const s: Session = base();
    s.observations = [{ id: 'ob-1', candidateId: 'foreign', stopId: 'around', text: 't', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' }];
    expect(validateImport(s).ok).toBe(false);
    const s2: Session = base();
    s2.observations = [{ id: 'ob-1', candidateId: 'demo-a', stopId: 'around', text: 't', question: '', sourceType: 'user', sourceUrl: 'https://user:pass@example.com', sourceDate: null, resolved: false, updatedAt: '' }];
    expect(validateImport(s2).ok).toBe(false);
    expect(isValidHttpUrl('https://user:pass@example.com')).toBe(false);
    expect(isValidDateString('2026-13-40')).toBe(false);
    expect(isValidDateString('2026-10-01')).toBe(true);
    const s3: Session = base();
    s3.observations = [
      { id: 'dup', candidateId: 'demo-a', stopId: 'around', text: 'a', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
      { id: 'dup', candidateId: 'demo-a', stopId: 'route', text: 'b', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' }
    ];
    expect(validateImport(s3).ok).toBe(false);
  });
  it('rejects mode mixing, bad stage and prototype keys', () => {
    const s: Session = base();
    s.candidates = [{ id: 'a', nickname: 'n', address: 'addr', source: 'user-confirmed', coords: null, confirmed: true }];
    expect(validateImport(s).ok).toBe(false);
    const s2: Session = base();
    (s2 as unknown as Record<string, unknown>).stage = 'nowhere';
    expect(validateImport(s2).ok).toBe(false);
    expect(validateImport(JSON.parse('{"version":1,"__proto__":{}}')).ok).toBe(false);
  });
  it('migrates legacy Korean priorities and demo defaults without touching user notes', () => {
    const legacy = { ...base(), priorities: ['\ud1b5\uadfc \ub3d9\uc120', '\uc7a5\ubcf4\uae30'], observations: [{ id: 'ob-1', candidateId: 'demo-a', stopId: 'around', text: 'my note stays', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' }] };
    const r = validateImport(legacy);
    expect(r.ok).toBe(true);
    expect(r.session?.priorities).toEqual(['Commute', 'Groceries']);
    expect(r.session?.observations[0].text).toBe('my note stays');
  });
  it('rejects invalid simulation field strictly', () => {
    const badHour = { ...base(), simulation: { hour: NaN, streetLights: true, showRoute: true, traffic: 1, camAngle: 0, camZoom: 1, walkStep: 0, playing: false } };
    expect(validateImport(badHour).ok).toBe(false);
    const badBool = { ...base(), simulation: { hour: 10, streetLights: 'yes', showRoute: true, traffic: 1, camAngle: 0, camZoom: 1, walkStep: 0, playing: false } };
    expect(validateImport(badBool).ok).toBe(false);
    const good = { ...base(), simulation: { hour: 40, streetLights: true, showRoute: true, traffic: 9, camAngle: 100, camZoom: 9, walkStep: 9, playing: false } };
    const rg = validateImport(good);
    expect(rg.ok).toBe(true);
    expect(rg.session?.simulation?.hour).toBe(23);
    expect(rg.session?.simulation?.traffic).toBe(2);
  });
  it('enforces priority limit and stage gating', () => {
    expect(togglePriorityWithLimit(['Commute', 'Groceries', 'Evening walk'], 'Building access').limited).toBe(true);
    expect(canEnterStage('visit', emptySession())).toBe(false);
    expect(hasConfirmedCandidate(base())).toBe(true);
  });
  it('resets unsafe context on mode and address change', () => {
    const live: Session = { ...emptySession(), mode: 'live', candidates: [{ id: 'live-a', nickname: 'Top', address: 'old address', source: 'user-confirmed', coords: null, confirmed: true }], activeCandidateId: 'live-a', observations: [{ id: 'ob-1', candidateId: 'live-a', stopId: 'around', text: 'old note', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' }], visitMemos: [{ id: 'm-1', candidateId: 'live-a', text: 'old memo', date: null, updatedAt: '' }] };
    const demo: Session = startDemoSession(live);
    expect(demo.observations.length).toBe(0);
    expect(demo.mode).toBe('demo');
    const relive: Session = startLiveSession(live, [{ id: 'live-a', nickname: 'Top', address: 'new address', source: 'user-confirmed', coords: null, confirmed: true }]);
    expect(relive.observations.length).toBe(0);
    const same: Session = startLiveSession(live, [{ id: 'live-a', nickname: 'Top', address: 'old address', source: 'user-confirmed', coords: null, confirmed: true }]);
    expect(same.observations.length).toBe(1);
  });
  it('measures utf8 bytes', () => { expect(byteSize(base()) > 0).toBe(true); });
});
