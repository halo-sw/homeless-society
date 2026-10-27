// Canonical server-side mirror of the real frontend domain contract
// (src/domain/session.ts). Frontend field names win; this file only
// re-declares them here so tsconfig.server rootDir=server keeps working.
const ID_MAX = 60;
const NICK_MAX = 40;
const ADDR_MAX = 120;
const TEXT_MAX = 2000;
const NOTES_MAX = 5000;
const URL_MAX = 2000;

export const ALLOWED_PRIORITIES: string[] = ['통근 동선', '장보기', '밤 귀가 확인', '건물 접근'];
export const ALLOWED_STOPS: string[] = ['around', 'route', 'entrance'];
export const ALLOWED_OBS_SOURCES: string[] = ['user', 'provider', 'hypothetical'];
export const ALLOWED_CAND_SOURCES: string[] = ['demo', 'user-confirmed'];
export const ALLOWED_STAGES: string[] = ['prep', 'visit', 'summary'];
const MAX_BYTES = 200 * 1024;
const MAX_CANDS = 2;
const MAX_PRI = 3;
const MAX_OBS = 200;
const MAX_MEMOS = 20;
const MAX_LOG = 30;

export interface ValidCoords { lat: number; lng: number; verified: boolean; }
export interface ValidCandidate {
  id: string;
  nickname: string;
  address: string;
  source: string;
  coords: ValidCoords | null;
  confirmed: boolean;
}
export interface ValidObservation {
  id: string;
  candidateId: string;
  stopId: string;
  text: string;
  question: string;
  sourceType: string;
  sourceUrl: string;
  sourceDate: string | null;
  resolved: boolean;
  updatedAt: string;
}
export interface ValidMemo {
  id: string;
  candidateId: string;
  text: string;
  date: string | null;
  updatedAt: string;
}
export interface ValidLog { at: string; note: string; }
export interface ValidSession {
  version?: number;
  mode: 'demo' | 'live';
  candidates: ValidCandidate[];
  activeCandidateId: string;
  activeStopId: string;
  priorities: string[];
  initialQuestions: string;
  observations: ValidObservation[];
  visitNotes?: string;
  visitMemos?: ValidMemo[];
  changeLog?: ValidLog[];
  complete?: boolean;
  updatedAt?: string;
  stage?: string;
}
export interface ModelQuestion { text: string; reason: string; evidenceIds: string[]; }

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isValidHttpUrl(u: string): boolean {
  if (!u) return true;
  try {
    const p = new URL(u);
    if (p.protocol !== 'http:' && p.protocol !== 'https:') return false;
    if (p.username || p.password) return false;
    if (!p.hostname) return false;
    if (/\s/.test(u)) return false;
    if (u.length > URL_MAX) return false;
    return true;
  } catch {
    return false;
  }
}

function isValidDateString(v: unknown): boolean {
  if (v === null) return true;
  if (typeof v !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const parts: number[] = v.split('-').map(Number);
  const y: number = parts[0];
  const m: number = parts[1];
  const d: number = parts[2];
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt: Date = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isValidTimestamp(v: unknown): boolean {
  if (v === '') return true;
  if (typeof v !== 'string' || !v) return false;
  return !Number.isNaN(Date.parse(v));
}

function isValidCoords(c: unknown): c is ValidCoords {
  if (c === null) return true;
  if (!isPlainObject(c)) return false;
  const v = c as Record<string, unknown>;
  return (
    typeof v.lat === 'number' && Number.isFinite(v.lat) && v.lat >= -90 && v.lat <= 90 &&
    typeof v.lng === 'number' && Number.isFinite(v.lng) && v.lng >= -180 && v.lng <= 180 &&
    typeof v.verified === 'boolean'
  );
}

export function validateSessionBody(v: unknown): { ok: boolean; error?: string; session?: ValidSession } {
  try {
    if (!isPlainObject(v)) return { ok: false, error: 'session 객체가 필요합니다.' };
    if (v.version !== undefined && v.version !== 1) return { ok: false, error: '지원하지 않는 기록 버전입니다.' };
    if (v.mode !== 'demo' && v.mode !== 'live') return { ok: false, error: 'mode가 올바르지 않습니다.' };
    const mode: 'demo' | 'live' = v.mode;
    const cands: unknown = v.candidates;
    if (!Array.isArray(cands) || cands.length > MAX_CANDS) {
      return { ok: false, error: '후보 주택은 최대 2곳입니다.' };
    }
    const seen = new Set<string>();
    const candidates: ValidCandidate[] = [];
    for (const c of cands) {
      if (!isPlainObject(c)) return { ok: false, error: '후보 정보가 올바르지 않습니다.' };
      const id: unknown = c.id;
      const nickname: unknown = c.nickname;
      const address: unknown = c.address;
      const source: unknown = c.source;
      const coords: unknown = c.coords ?? null;
      const confirmed: unknown = c.confirmed;
      if (typeof id !== 'string' || !id.trim() || id.length > ID_MAX) {
        return { ok: false, error: '후보 id가 올바르지 않습니다.' };
      }
      if (seen.has(id)) return { ok: false, error: '후보 id가 중복되었습니다.' };
      seen.add(id);
      if (typeof nickname !== 'string' || !nickname.trim() || nickname.length > NICK_MAX) {
        return { ok: false, error: '후보 별명이 올바르지 않습니다.' };
      }
      if (typeof address !== 'string' || !address.trim() || address.length > ADDR_MAX) {
        return { ok: false, error: '후보 주소가 올바르지 않습니다.' };
      }
      if (typeof source !== 'string' || !ALLOWED_CAND_SOURCES.includes(source)) {
        return { ok: false, error: '후보 출처가 올바르지 않습니다.' };
      }
      if (coords !== null && !isValidCoords(coords)) {
        return { ok: false, error: '좌표가 올바르지 않습니다.' };
      }
      if (typeof confirmed !== 'boolean') {
        return { ok: false, error: '주소 확인 표시가 올바르지 않습니다.' };
      }
      if (mode === 'demo' && source !== 'demo') {
        return { ok: false, error: '가상 예시 기록에 실제 주소 출처가 섞여 있습니다.' };
      }
      if (mode === 'live' && source !== 'user-confirmed') {
        return { ok: false, error: '내 주소 기록에 가상 출처가 섞여 있습니다.' };
      }
      candidates.push({
        id, nickname, address, source,
        coords: (coords as ValidCoords | null) ?? null,
        confirmed,
      });
    }
    const ids = new Set<string>(candidates.map((c) => c.id));
    const activeCandidateId: unknown = v.activeCandidateId;
    if (typeof activeCandidateId !== 'string') {
      return { ok: false, error: '선택된 후보 정보가 올바르지 않습니다.' };
    }
    if (candidates.length === 0) {
      if (activeCandidateId !== '') return { ok: false, error: '선택된 후보 정보가 올바르지 않습니다.' };
    } else if (!ids.has(activeCandidateId)) {
      return { ok: false, error: '선택된 후보가 목록에 없습니다.' };
    }
    const activeStopId: unknown = v.activeStopId;
    if (typeof activeStopId !== 'string' || !ALLOWED_STOPS.includes(activeStopId)) {
      return { ok: false, error: '관찰 지점이 올바르지 않습니다.' };
    }
    const pris: unknown = v.priorities;
    if (!Array.isArray(pris) || pris.length > MAX_PRI) {
      return { ok: false, error: '관심사는 최대 3개입니다.' };
    }
    const pset = new Set<string>();
    for (const p of pris) {
      if (typeof p !== 'string' || !ALLOWED_PRIORITIES.includes(p)) {
        return { ok: false, error: '관심사가 올바르지 않습니다.' };
      }
      if (pset.has(p)) return { ok: false, error: '관심사가 중복되었습니다.' };
      pset.add(p);
    }
    const initialQuestions: unknown = v.initialQuestions;
    if (typeof initialQuestions !== 'string' || initialQuestions.length > TEXT_MAX) {
      return { ok: false, error: '처음 질문이 제한을 초과했습니다.' };
    }
    const obsRaw: unknown = v.observations;
    if (!Array.isArray(obsRaw) || obsRaw.length > MAX_OBS) {
      return { ok: false, error: '관찰 기록이 제한을 초과했습니다.' };
    }
    const seenOb = new Set<string>();
    const observations: ValidObservation[] = [];
    for (const o of obsRaw) {
      if (!isPlainObject(o)) return { ok: false, error: '관찰 항목이 올바르지 않습니다.' };
      const oid: unknown = o.id;
      const ocid: unknown = o.candidateId;
      const stopId: unknown = o.stopId;
      const text: unknown = o.text;
      const question: unknown = o.question;
      const sourceType: unknown = o.sourceType;
      const sourceUrl: unknown = o.sourceUrl;
      const sourceDate: unknown = o.sourceDate ?? null;
      const resolved: unknown = o.resolved;
      const updatedAt: unknown = o.updatedAt;
      if (typeof oid !== 'string' || !oid.trim() || oid.length > ID_MAX) {
        return { ok: false, error: '관찰 id가 올바르지 않습니다.' };
      }
      if (seenOb.has(oid)) return { ok: false, error: '관찰 id가 중복되었습니다.' };
      seenOb.add(oid);
      if (typeof ocid !== 'string' || !ids.has(ocid)) {
        return { ok: false, error: '알 수 없는 후보를 가리키는 관찰이 있습니다.' };
      }
      if (typeof stopId !== 'string' || !ALLOWED_STOPS.includes(stopId)) {
        return { ok: false, error: '관찰 지점이 올바르지 않습니다.' };
      }
      if (typeof text !== 'string' || !text.trim() || text.length > TEXT_MAX) {
        return { ok: false, error: '관찰 내용이 올바르지 않습니다.' };
      }
      if (typeof question !== 'string' || question.length > TEXT_MAX) {
        return { ok: false, error: '관찰 질문이 제한을 초과했습니다.' };
      }
      if (typeof sourceType !== 'string' || !ALLOWED_OBS_SOURCES.includes(sourceType)) {
        return { ok: false, error: '관찰 출처가 올바르지 않습니다.' };
      }
      if (typeof sourceUrl !== 'string' || !isValidHttpUrl(sourceUrl)) {
        return { ok: false, error: '출처 URL은 http(s)로 시작해야 합니다.' };
      }
      if (!isValidDateString(sourceDate)) {
        return { ok: false, error: '출처 날짜가 올바르지 않습니다.' };
      }
      if (typeof resolved !== 'boolean') {
        return { ok: false, error: '해결 표시가 올바르지 않습니다.' };
      }
      if (typeof updatedAt !== 'string' || !isValidTimestamp(updatedAt)) {
        return { ok: false, error: '관찰 시점이 올바르지 않습니다.' };
      }
      if (mode === 'demo' && sourceType === 'provider') {
        return { ok: false, error: '가상 예시에 외부 제공 출처가 섞여 있습니다.' };
      }
      if (mode === 'live' && sourceType === 'hypothetical') {
        return { ok: false, error: '내 주소 기록에 가상 관찰이 섞여 있습니다.' };
      }
      observations.push({
        id: oid, candidateId: ocid, stopId, text, question,
        sourceType, sourceUrl, sourceDate: (sourceDate as string | null) ?? null,
        resolved, updatedAt,
      });
    }
    let visitNotes: string | undefined;
    if (v.visitNotes !== undefined) {
      if (typeof v.visitNotes !== 'string' || v.visitNotes.length > NOTES_MAX) {
        return { ok: false, error: '방문 메모가 제한을 초과했습니다.' };
      }
      visitNotes = v.visitNotes;
    }
    let visitMemos: ValidMemo[] | undefined;
    if (v.visitMemos !== undefined) {
      if (!Array.isArray(v.visitMemos) || v.visitMemos.length > MAX_MEMOS) {
        return { ok: false, error: '방문 메모가 제한을 초과했습니다.' };
      }
      const mids = new Set<string>();
      const memos: ValidMemo[] = [];
      for (const m of v.visitMemos) {
        if (!isPlainObject(m)) return { ok: false, error: '방문 메모가 올바르지 않습니다.' };
        const mid: unknown = m.id;
        const mcid: unknown = m.candidateId;
        const mtext: unknown = m.text;
        const mdate: unknown = m.date ?? null;
        const mup: unknown = m.updatedAt;
        if (typeof mid !== 'string' || !mid.trim() || mid.length > ID_MAX) {
          return { ok: false, error: '방문 메모 id가 올바르지 않습니다.' };
        }
        if (mids.has(mid)) return { ok: false, error: '방문 메모 id가 중복되었습니다.' };
        mids.add(mid);
        if (typeof mcid !== 'string' || !ids.has(mcid)) {
          return { ok: false, error: '알 수 없는 후보의 메모가 있습니다.' };
        }
        if (typeof mtext !== 'string' || !mtext.trim() || mtext.length > TEXT_MAX) {
          return { ok: false, error: '방문 메모 내용이 올바르지 않습니다.' };
        }
        if (!isValidDateString(mdate)) return { ok: false, error: '방문 메모 날짜가 올바르지 않습니다.' };
        if (typeof mup !== 'string' || !isValidTimestamp(mup)) {
          return { ok: false, error: '방문 메모 시점이 올바르지 않습니다.' };
        }
        memos.push({ id: mid, candidateId: mcid, text: mtext, date: (mdate as string | null) ?? null, updatedAt: mup });
      }
      visitMemos = memos;
    }
    let changeLog: ValidLog[] | undefined;
    if (v.changeLog !== undefined) {
      if (!Array.isArray(v.changeLog) || v.changeLog.length > MAX_LOG) {
        return { ok: false, error: '변경 이력이 제한을 초과했습니다.' };
      }
      const logs: ValidLog[] = [];
      for (const e of v.changeLog) {
        if (!isPlainObject(e)) return { ok: false, error: '변경 이력이 올바르지 않습니다.' };
        const at: unknown = e.at;
        const note: unknown = e.note;
        if (typeof at !== 'string' || !at || !isValidTimestamp(at)) {
          return { ok: false, error: '변경 이력 시점이 올바르지 않습니다.' };
        }
        if (typeof note !== 'string' || !note.trim() || note.length > TEXT_MAX) {
          return { ok: false, error: '변경 이력 내용이 올바르지 않습니다.' };
        }
        logs.push({ at, note });
      }
      changeLog = logs;
    }
    if (v.complete !== undefined && typeof v.complete !== 'boolean') {
      return { ok: false, error: '완료 표시가 올바르지 않습니다.' };
    }
    if (v.updatedAt !== undefined && (typeof v.updatedAt !== 'string' || !isValidTimestamp(v.updatedAt))) {
      return { ok: false, error: '업데이트 시점이 올바르지 않습니다.' };
    }
    if (v.stage !== undefined && (typeof v.stage !== 'string' || !ALLOWED_STAGES.includes(v.stage))) {
      return { ok: false, error: '저장된 단계가 올바르지 않습니다.' };
    }
    let bytes = 0;
    try {
      bytes = Buffer.byteLength(JSON.stringify(v), 'utf8');
    } catch {
      return { ok: false, error: '요청 크기가 제한을 초과했습니다.' };
    }
    if (bytes > MAX_BYTES) return { ok: false, error: '요청 크기가 제한을 초과했습니다.' };
    const session: ValidSession = {
      mode,
      candidates,
      activeCandidateId: activeCandidateId as string,
      activeStopId: activeStopId as string,
      priorities: [...pset],
      initialQuestions: initialQuestions as string,
      observations,
    };
    if (typeof v.version === 'number') session.version = v.version;
    if (visitNotes !== undefined) session.visitNotes = visitNotes;
    if (visitMemos !== undefined) session.visitMemos = visitMemos;
    if (changeLog !== undefined) session.changeLog = changeLog;
    if (typeof v.complete === 'boolean') session.complete = v.complete;
    if (typeof v.updatedAt === 'string') session.updatedAt = v.updatedAt;
    if (typeof v.stage === 'string') session.stage = v.stage;
    return { ok: true, session };
  } catch {
    return { ok: false, error: 'session 검증 중 오류가 발생했습니다.' };
  }
}

const BANNED: string[] = ['안전합니다', '안전함', '사기 아님', '투자 수익', '범죄율', '대출 가능', '법적 권리 보장', '시세 상승'];
export function hasBannedClaim(s: string): boolean {
  if (typeof s !== 'string') return false;
  return BANNED.some((b) => s.includes(b));
}

// Keyword filtering is only a heuristic; it does not guarantee factual safety.
export function validateModelOutput(v: unknown, knownIds: string[]): { questions: ModelQuestion[] } {
  const out: ModelQuestion[] = [];
  if (!isPlainObject(v)) return { questions: [] };
  const raw: unknown = (v as { questions?: unknown }).questions;
  if (!Array.isArray(raw)) return { questions: [] };
  const known = new Set<string>(
    Array.isArray(knownIds) ? knownIds.filter((id): id is string => typeof id === 'string') : []
  );
  const SCAN_MAX = 20;
  const scanned: unknown[] = raw.slice(0, SCAN_MAX);
  for (const q of scanned) {
    if (out.length >= 3) break;
    if (!isPlainObject(q)) continue;
    const rec = q as Record<string, unknown>;
    if (typeof rec.text !== 'string') continue;
    const text: string = rec.text.trim();
    if (text.length < 2 || text.length > 300) continue;
    if (!text.endsWith('?') && !text.endsWith('？')) continue;
    let reason = '';
    if (rec.reason === undefined || rec.reason === null || rec.reason === '') {
      reason = '';
    } else if (typeof rec.reason !== 'string') {
      continue;
    } else {
      reason = rec.reason.trim().slice(0, 300);
    }
    if (!Array.isArray(rec.evidenceIds)) continue;
    if (rec.evidenceIds.length > 4) continue;
    let foreign = false;
    const ids: string[] = [];
    for (const id of rec.evidenceIds) {
      if (typeof id !== 'string' || !known.has(id)) {
        foreign = true;
        break;
      }
      ids.push(id);
    }
    if (foreign) continue;
    if (hasBannedClaim(text) || (reason && hasBannedClaim(reason))) continue;
    out.push({ text, reason, evidenceIds: ids });
  }
  return { questions: out.slice(0, 3) };
}
