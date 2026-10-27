import { describe, expect, it } from 'vitest';
import { validateModelOutput, validateSessionBody } from '../server/sessionValidate';

function liveBase() {
  return {
    version: 1,
    mode: 'live',
    candidates: [{ id: 'c1', nickname: '1호', address: '서울 마포구', source: 'user-confirmed', coords: null, confirmed: true }],
    activeCandidateId: 'c1',
    activeStopId: 'around',
    priorities: ['통근 동선'],
    initialQuestions: '관리비가 얼마인가요?',
    observations: [
      {
        id: 'ob-1',
        candidateId: 'c1',
        stopId: 'around',
        text: '낮에 조용했다',
        question: '밤에도 조용한가요?',
        sourceType: 'user',
        sourceUrl: '',
        sourceDate: null,
        resolved: false,
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ],
    visitNotes: '',
    visitMemos: [{ id: 'm-1', candidateId: 'c1', text: '밤에 방문함', date: '2026-10-02', updatedAt: '2026-10-02T00:00:00.000Z' }],
    changeLog: [{ at: '2026-10-02T00:00:00.000Z', note: '후보 확정' }],
    complete: false,
    updatedAt: '2026-10-02T00:00:00.000Z',
  };
}

function demoBase() {
  return {
    version: 1,
    mode: 'demo',
    candidates: [
      { id: 'demo-a', nickname: '해뜰집', address: '솔안마을(가상) 해뜰길 1', source: 'demo', coords: null, confirmed: true },
      { id: 'demo-b', nickname: '달빛집', address: '솔안마을(가상) 달빛길 2', source: 'demo', coords: null, confirmed: true },
    ],
    activeCandidateId: 'demo-a',
    activeStopId: 'around',
    priorities: ['통근 동선', '밤 귀가 확인'],
    initialQuestions: '가상 질문',
    observations: [],
    visitNotes: '',
    visitMemos: [],
    changeLog: [],
    complete: false,
    updatedAt: '2026-10-02T00:00:00.000Z',
  };
}

describe('session body (real Session schema)', () => {
  it('accepts demo and live bodies and strips unknown fields', () => {
    const live = validateSessionBody({ ...liveBase(), extra: 1, candidates: [{ ...liveBase().candidates[0], unknown: true }] });
    expect(live.ok).toBe(true);
    expect((live.session as unknown as Record<string, unknown>).extra).toBeUndefined();
    expect((live.session as unknown as { candidates: Record<string, unknown>[] }).candidates[0].unknown).toBeUndefined();
    expect(validateSessionBody(demoBase()).ok).toBe(true);
  });
  it('accepts a privacy subset with only the active candidate', () => {
    const full = liveBase();
    (full as unknown as Record<string, unknown>).candidates = [
      ...full.candidates,
      { id: 'c2', nickname: '2호', address: '서울 서대문구', source: 'user-confirmed', coords: null, confirmed: true },
    ];
    const subset = {
      ...full,
      candidates: [full.candidates[0]],
      observations: full.observations.filter((o) => o.candidateId === 'c1'),
      visitMemos: full.visitMemos.filter((m) => m.candidateId === 'c1'),
      visitNotes: '',
      changeLog: [],
    };
    const v = validateSessionBody(subset);
    expect(v.ok).toBe(true);
    expect(v.session?.observations.every((o) => o.candidateId === 'c1')).toBe(true);
  });
  it('rejects candidate, observation, priority and id problems', () => {
    expect(validateSessionBody({ ...liveBase(), candidates: [{ ...liveBase().candidates[0] }, { ...liveBase().candidates[0] }] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), candidates: [{ id: '', nickname: 'n', address: 'a', source: 'user-confirmed', coords: null, confirmed: true }] }).ok).toBe(false);
    expect(
      validateSessionBody({
        ...liveBase(),
        candidates: [
          { id: 'c1', nickname: 'n1', address: 'a1', source: 'user-confirmed', coords: null, confirmed: true },
          { id: 'c2', nickname: 'n2', address: 'a2', source: 'user-confirmed', coords: null, confirmed: true },
          { id: 'c3', nickname: 'n3', address: 'a3', source: 'user-confirmed', coords: null, confirmed: true },
        ],
      }).ok,
    ).toBe(false);
    expect(validateSessionBody({ ...liveBase(), activeCandidateId: 'foreign' }).ok).toBe(false);
    expect(
      validateSessionBody({
        ...liveBase(),
        observations: [
          { id: 'ob-9', candidateId: 'foreign', stopId: 'around', text: 'x', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateSessionBody({
        ...liveBase(),
        observations: [
          { id: 'ob-1', candidateId: 'c1', stopId: 'around', text: 'a', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
          { id: 'ob-1', candidateId: 'c1', stopId: 'route', text: 'b', question: '', sourceType: 'user', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
        ],
      }).ok,
    ).toBe(false);
    expect(validateSessionBody({ ...liveBase(), priorities: ['통근 동선', '장보기', '밤 귀가 확인', '건물 접근'] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), priorities: ['nope'] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), priorities: ['safety'] }).ok).toBe(false);
    expect(
      validateSessionBody({
        ...liveBase(),
        observations: [
          { id: 'ob-1', candidateId: 'c1', stopId: 'around', text: 'x', question: '', sourceType: 'unknownsource', sourceUrl: '', sourceDate: null, resolved: false, updatedAt: '' },
        ],
      }).ok,
    ).toBe(false);
  });
  it('rejects bad dates, urls, mode mixing and changeLog problems', () => {
    expect(
      validateSessionBody({
        ...liveBase(),
        observations: [
          { id: 'ob-1', candidateId: 'c1', stopId: 'around', text: 'x', question: '', sourceType: 'user', sourceUrl: 'https://user:pass@example.com', sourceDate: null, resolved: false, updatedAt: '' },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateSessionBody({
        ...liveBase(),
        observations: [
          { id: 'ob-1', candidateId: 'c1', stopId: 'around', text: 'x', question: '', sourceType: 'user', sourceUrl: '', sourceDate: '2026-13-40', resolved: false, updatedAt: '' },
        ],
      }).ok,
    ).toBe(false);
    expect(validateSessionBody({ ...liveBase(), mode: 'live', candidates: [{ id: 'c1', nickname: 'n', address: 'a', source: 'demo', coords: null, confirmed: true }] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), changeLog: [{ at: 'bad', note: '' }] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), changeLog: [{ at: '', note: 'x' }] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), visitMemos: [{ id: 'm-1', candidateId: 'foreign', text: 'x', date: null, updatedAt: '' }] }).ok).toBe(false);
  });
  it('validates strict types without crashing on nulls', () => {
    expect(validateSessionBody(null).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), candidates: [null] }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), complete: 'yes' as unknown as boolean }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), updatedAt: 'not-a-date' }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), initialQuestions: ['q'] as unknown as string }).ok).toBe(false);
    expect(validateSessionBody({ ...liveBase(), complete: true }).ok).toBe(true);
  });
});

describe('model output', () => {
  it('rejects questions with unknown ids instead of stripping', () => {
    const v = validateModelOutput({ questions: [{ text: '확인해 보시겠어요?', reason: 'r', evidenceIds: ['ob-1', 'foreign'] }] }, ['ob-1']);
    expect(v.questions).toEqual([]);
  });
  it('requires ? endings and arrays', () => {
    expect(validateModelOutput({ questions: [{ text: '마침표.', reason: '', evidenceIds: [] }] }, []).questions).toEqual([]);
    expect(validateModelOutput({ questions: [{ text: '좋은 질문?', reason: '', evidenceIds: 'ob-1' }] }, ['ob-1']).questions).toEqual([]);
    expect(validateModelOutput({ nope: 1 }, []).questions).toEqual([]);
  });
  it('scans past invalid items to collect up to 3 valid', () => {
    const v = validateModelOutput(
      {
        questions: [
          { text: '외부 근거 질문?', reason: 'x', evidenceIds: ['foreign'] },
          { text: '마침표로 끝남.', reason: 'x', evidenceIds: [] },
          { text: '첫 번째 확인 질문?', reason: 'a', evidenceIds: [] },
          { text: '두 번째 확인 질문?', reason: 'b', evidenceIds: [] },
          { text: '세 번째 확인 질문?', reason: 'c', evidenceIds: [] },
          { text: '네 번째 확인 질문?', reason: 'd', evidenceIds: [] },
        ],
      },
      [],
    );
    expect(v.questions.map((q) => q.text)).toEqual(['첫 번째 확인 질문?', '두 번째 확인 질문?', '세 번째 확인 질문?']);
  });
});
