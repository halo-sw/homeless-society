import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetBudgetChain, budgetStatus } from '../server/budget';
import { CLI_MAX_BUFFER, CLI_TIMEOUT_MS, MODEL, cliArgs, planQuestions, type ExecLike, type FetchLike } from '../server/muse';
let oldEnv: Record<string, string | undefined>;
let dir: string;
beforeEach(async () => {
  oldEnv = { ...process.env };
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hs-muse-'));
  process.env.MUSE_LEDGER_PATH = path.join(dir, 'ledger.json');
  process.env.MUSE_BUDGET_USD = '10';
  delete process.env.MUSE_MAX_CALLS;
  delete process.env.MODEL_API_KEY;
  delete process.env.MUSE_BIN;
  _resetBudgetChain();
});
afterEach(async () => {
  process.env = oldEnv as NodeJS.ProcessEnv;
  await fs.rm(dir, { recursive: true, force: true });
});
function session() {
  return {
    session: {
      version: 1,
      mode: 'live',
      candidates: [{ id: 'c1', nickname: '1호', address: '서울 마포구', source: 'user-confirmed', coords: null, confirmed: true }],
      activeCandidateId: 'c1',
      activeStopId: 'around',
      priorities: ['통근 동선'],
      initialQuestions: '역까지 얼마나 걸리나요?',
      observations: [
        {
          id: 'ob-1',
          candidateId: 'c1',
          stopId: 'around',
          text: '밤에 골목이 어두웠다',
          question: '가로등이 있나요?',
          sourceType: 'user',
          sourceUrl: '',
          sourceDate: null,
          resolved: false,
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      visitNotes: '',
      visitMemos: [],
      changeLog: [],
      complete: false,
      updatedAt: '2026-10-02T00:00:00.000Z',
    },
  };
}
function cliStdout(text: string, withUsage = true): string {
  const lines: string[] = [
    JSON.stringify({ payload_type: 'run.model.configured', payload: { provider_id: 'meta', model_id: 'muse-spark-1.3' } }),
    JSON.stringify({ payload_type: 'task.delta', payload: { text: 'reasoning must be ignored' } }),
    JSON.stringify({
      payload_type: 'task.lifecycle.status',
      payload: { event: { details: { phase: 'stream_succeeded', facets: [{ kind: 'producer', detail: { provider: 'meta', model: 'muse-spark-1.3' } }] } } },
    }),
  ];
  if (withUsage) {
    lines.push(
      JSON.stringify({
        payload_type: 'run.usage',
        payload: { models: [{ model: 'muse-spark-1.3', input_tokens: 29069, cached_tokens: 100, output_tokens: 500, calls: 1 }], calls: 1 },
      }),
    );
  }
  lines.push(JSON.stringify({ payload_type: 'run.terminal.completed', payload: { text } }));
  return lines.join('\n');
}
function apiOk(text: string): FetchLike {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: MODEL,
      choices: [{ message: { content: text } }],
      usage: { prompt_tokens: 2000, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 100 } },
    }),
  });
}
describe('keyless honest result', () => {
  it('returns local-template without a Muse answer', async () => {
    const out = await planQuestions(session());
    expect(out.mock).toBe(true);
    expect(out.model).toBe('local-template');
    expect(out.questions.length).toBe(1);
    expect(out.questions[0].evidenceIds).toEqual([]);
  });
});
describe('session validation', () => {
  it('rejects malformed and null sessions', async () => {
    const badBodies: unknown[] = [
      null,
      {},
      { session: null },
      { session: { mode: 'live', candidates: [{ id: '' }], observations: [] } },
      { session: { mode: 'live', candidates: null, observations: [] } },
      { session: { mode: 'live', candidates: [{ id: 'c1' }], observations: [null] } },
      { session: { ...session().session, priorities: ['safety'] } },
      { session: { ...session().session, initialQuestions: ['q'] } },
    ];
    for (const bad of badBodies) {
      await expect(planQuestions(bad)).rejects.toMatchObject({ status: 400 });
    }
  });
});
describe('CLI transport', () => {
  it('uses the exact installed flags and parses only terminal text', async () => {
    process.env.MUSE_BIN = '/usr/local/bin/muse';
    const seen: {
      args?: string[];
      opts?: { timeout: number; maxBuffer: number; env: Record<string, string | undefined> };
    } = {};
    const execFn: ExecLike = async (_f, args, opts) => {
      seen.args = args;
      seen.opts = opts;
      return { stdout: cliStdout(JSON.stringify({ questions: [{ text: '가로등 상태를 확인해 보시겠어요?', reason: '야간 공백', evidenceIds: ['ob-1'] }] })) };
    };
    const out = await planQuestions(session(), { execFn });
    expect(out.mock).toBe(false);
    expect(out.model).toBe(MODEL);
    expect(out.questions[0].evidenceIds).toEqual(['ob-1']);
    expect(seen.args?.slice(0, -1)).toEqual([
      'exec',
      '--preset',
      'empty',
      '--provider',
      'meta',
      '--model',
      'muse-spark-1.3',
      '--contributor-mode',
      'off',
      '--disable-shell',
      '--disable-write',
      '--disable-web-tools',
      '--disable-reminders',
      '--no-foreign-personal-context',
      '--approval-mode',
      'untrusted',
      '--approval-judge',
      'off',
      '--max-model-steps',
      '1',
      '--json',
      '--prompt-file',
    ]);
    expect(typeof seen.args?.[seen.args.length - 1]).toBe('string');
    expect(seen.opts?.timeout).toBe(CLI_TIMEOUT_MS);
    expect(seen.opts?.maxBuffer).toBe(CLI_MAX_BUFFER);
    expect(seen.opts?.env.MUSE_NO_AUTO_UPDATE).toBe('1');
  });
  it('withholds workspace file tools with preset empty immediately after exec', async () => {
    const args = cliArgs('/tmp/prompt.txt');
    expect(args.slice(0, 3)).toEqual(['exec', '--preset', 'empty']);
    expect(args).not.toContain('--trust');
    expect(args).not.toContain('--yolo');
    expect(args).toContain('--disable-shell');
    expect(args).toContain('--disable-write');
    expect(args).toContain('--approval-mode');
  });
  it('rejects missing terminal or unverified model', async () => {
    process.env.MUSE_BIN = '/usr/local/bin/muse';
    const noTerminal: ExecLike = async () => ({
      stdout: JSON.stringify({ payload_type: 'run.model.configured', payload: { provider_id: 'meta', model_id: MODEL } }),
    });
    await expect(planQuestions(session(), { execFn: noTerminal })).rejects.toMatchObject({ status: 502 });
    const wrongModel: ExecLike = async () => ({
      stdout: cliStdout(JSON.stringify({ questions: [] })).replaceAll('muse-spark-1.3', 'other-model'),
    });
    await expect(planQuestions(session(), { execFn: wrongModel })).rejects.toMatchObject({ status: 502 });
  });
  it('retains full reservation when usage is absent', async () => {
    process.env.MUSE_BIN = '/usr/local/bin/muse';
    const execFn: ExecLike = async () => ({ stdout: cliStdout(JSON.stringify({ questions: [] }), false) });
    await expect(planQuestions(session(), { execFn })).rejects.toMatchObject({ status: 502 });
    const b = await budgetStatus();
    expect(b.calls).toBe(1);
    expect(b.spentUsd).toBeCloseTo(1.9, 6);
  });
});
describe('API transport', () => {
  it('requires response.model match and real usage', async () => {
    process.env.MODEL_API_KEY = 'k';
    const out = await planQuestions(session(), {
      fetchFn: apiOk(JSON.stringify({ questions: [{ text: '낮 소음을 확인해 보시겠어요?', reason: '주간 공백', evidenceIds: [] }] })),
    });
    expect(out.model).toBe(MODEL);
    expect(out.questions.length).toBe(1);
  });
  it('rejects wrong model and missing usage without fake defaults', async () => {
    process.env.MODEL_API_KEY = 'k';
    const wrong: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'other',
        choices: [{ message: { content: '{"questions":[]}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 10 },
      }),
    });
    await expect(planQuestions(session(), { fetchFn: wrong })).rejects.toMatchObject({ status: 502 });
    const noUsage: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ model: MODEL, choices: [{ message: { content: '{"questions":[]}' } }] }),
    });
    const before = await budgetStatus();
    await expect(planQuestions(session(), { fetchFn: noUsage })).rejects.toMatchObject({ status: 502 });
    const after = await budgetStatus();
    expect(after.calls).toBe(before.calls + 1);
    expect(after.spentUsd).toBeGreaterThan(before.spentUsd);
  });
  it('makes exactly one call even on empty output', async () => {
    process.env.MODEL_API_KEY = 'k';
    const fn = vi.fn(apiOk(JSON.stringify({ questions: [] })));
    const out = await planQuestions(session(), { fetchFn: fn });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(out.questions).toEqual([]);
  });
});
describe('output validation', () => {
  it('rejects whole questions with foreign ids and enforces ? ending and max 3', async () => {
    process.env.MODEL_API_KEY = 'k';
    const mixed: string = JSON.stringify({
      questions: [
        { text: '외부 근거 질문?', reason: 'x', evidenceIds: ['nope'] },
        { text: '마침표로 끝남.', reason: 'x', evidenceIds: [] },
        { text: '첫 번째 확인 질문?', reason: 'a', evidenceIds: [] },
        { text: '두 번째 확인 질문?', reason: 'b', evidenceIds: [] },
        { text: '세 번째 확인 질문?', reason: 'c', evidenceIds: [] },
        { text: '네 번째 확인 질문?', reason: 'd', evidenceIds: [] },
      ],
    });
    const out = await planQuestions(session(), { fetchFn: apiOk(mixed) });
    expect(out.questions.length).toBe(3);
    expect(out.questions.map((q) => q.text)).toEqual(['첫 번째 확인 질문?', '두 번째 확인 질문?', '세 번째 확인 질문?']);
  });
});
