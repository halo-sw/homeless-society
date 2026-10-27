import { describe, expect, it } from 'vitest';
import {
  byteSize,
  canEnterStage,
  containsBannedClaim,
  emptySession,
  hasConfirmedCandidate,
  isValidDateString,
  isValidHttpUrl,
  observationsFor,
  openQuestions,
  startDemoSession,
  startLiveSession,
  summarize,
  togglePriorityWithLimit,
  validateImport,
  validUrl,
  type Session,
} from '../src/domain/session';

function base(): Session {
  const s: Session = emptySession();
  s.mode = 'demo';
  s.candidates = [{ id: 'demo-a', nickname: '해뜰집', address: '가상', source: 'demo', coords: null, confirmed: true }];
  s.activeCandidateId = 'demo-a';
  return s;
}

describe('session state', () => {
  it('filters observations per candidate and stop without mixing', () => {
    const s: Session = base();
    s.observations = [
      { id: 'ob-1', candidateId: 'demo-a', stopId: 'around', text: '밝음', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
      { id: 'ob-2', candidateId: 'demo-b', stopId: 'around', text: '어두움', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
    ];
    expect(observationsFor(s, 'demo-a', 'around').map((o) => o.id)).toEqual(['ob-1']);
  });
  it('recomputes summary after deletion', () => {
    const s: Session = base();
    s.observations = [
      { id: 'ob-1', candidateId: 'demo-a', stopId: 'around', text: '밝음', question: '밝나요?', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: true, updatedAt: '' },
    ];
    expect(summarize(s).learned).toEqual(['밝음']);
    s.observations = [];
    expect(summarize(s).learned).toEqual([]);
  });
  it('keeps unknown dates and prioritizes open questions', () => {
    const s: Session = base();
    s.observations = [1, 2, 3, 4].map((i) => ({
      id: 'ob-' + i,
      candidateId: 'demo-a',
      stopId: 'around' as const,
      text: 't' + i,
      question: 'q' + i,
      sourceType: 'user' as const,
      sourceUrl: '',
      sourceDate: null,
      resolved: false,
      updatedAt: '',
    }));
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
  it('flags safety guarantee phrasing', () => {
    expect(containsBannedClaim('이 집은 안전합니다')).toBe(true);
    expect(containsBannedClaim('밤 밝기를 확인하세요')).toBe(false);
  });
  it('rejects foreign ids, credentials urls, bad dates and duplicates', () => {
    const s: Session = base();
    s.observations = [
      { id: 'ob-1', candidateId: 'foreign', stopId: 'around', text: 't', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
    ];
    expect(validateImport(s).ok).toBe(false);
    const s2: Session = base();
    s2.observations = [
      { id: 'ob-1', candidateId: 'demo-a', stopId: 'around', text: 't', question: '', sourceType: 'user', sourceUrl: 'https://user:pass@example.com', sourceDate: null, resolved: false, updatedAt: '' },
    ];
    expect(validateImport(s2).ok).toBe(false);
    expect(isValidHttpUrl('https://user:pass@example.com')).toBe(false);
    expect(isValidDateString('2026-13-40')).toBe(false);
    expect(isValidDateString('2026-10-01')).toBe(true);
    const s3: Session = base();
    s3.observations = [
      { id: 'dup', candidateId: 'demo-a', stopId: 'around', text: 'a', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
      { id: 'dup', candidateId: 'demo-a', stopId: 'route', text: 'b', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
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
  it('validates changeLog entries fully without crashing', () => {
    const good: Session = base();
    good.changeLog = [{ at: '2026-10-02T00:00:00.000Z', note: '확정' }];
    expect(validateImport(good).ok).toBe(true);
    const badAt = base();
    (badAt as unknown as Record<string, unknown>).changeLog = [{ at: 'bad', note: 'x' }];
    expect(validateImport(badAt).ok).toBe(false);
    const badNote = base();
    (badNote as unknown as Record<string, unknown>).changeLog = [{ at: '2026-10-02T00:00:00.000Z', note: '' }];
    expect(validateImport(badNote).ok).toBe(false);
    const badShape = base();
    (badShape as unknown as Record<string, unknown>).changeLog = [null];
    expect(validateImport(badShape).ok).toBe(false);
    expect(validateImport({ ...base(), changeLog: 'x' }).ok).toBe(false);
  });
  it('enforces priority limit and stage gating', () => {
    expect(togglePriorityWithLimit(['통근 동선', '장보기', '밤 귀가 확인'], '건물 접근').limited).toBe(true);
    expect(canEnterStage('visit', emptySession())).toBe(false);
    expect(hasConfirmedCandidate(base())).toBe(true);
  });
  it('resets unsafe context on mode and address change', () => {
    const live: Session = {
      ...emptySession(),
      mode: 'live',
      candidates: [{ id: 'live-a', nickname: '1순위', address: '옛 주소', source: 'user-confirmed', coords: null, confirmed: true }],
      activeCandidateId: 'live-a',
      observations: [
        { id: 'ob-1', candidateId: 'live-a', stopId: 'around', text: '옛 기록', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
      ],
      visitMemos: [{ id: 'm-1', candidateId: 'live-a', text: '옛 메모', date: null, updatedAt: '' }],
    };
    const demo: Session = startDemoSession(live);
    expect(demo.observations.length).toBe(0);
    expect(demo.mode).toBe('demo');
    const relive: Session = startLiveSession(live, [
      { id: 'live-a', nickname: '1순위', address: '새 주소', source: 'user-confirmed', coords: null, confirmed: true },
    ]);
    expect(relive.observations.length).toBe(0);
    expect(relive.visitMemos?.length ?? 0).toBe(0);
    const same: Session = startLiveSession(live, [
      { id: 'live-a', nickname: '1순위', address: '옛 주소', source: 'user-confirmed', coords: null, confirmed: true },
    ]);
    expect(same.observations.length).toBe(1);
    expect(same.visitMemos?.length ?? 0).toBe(1);
  });
  it('measures utf8 bytes', () => {
    expect(byteSize(base()) > 0).toBe(true);
  });
});
