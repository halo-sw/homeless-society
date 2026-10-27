import { DEFAULT_SIM, validateSimState, type SimState } from "./simulation";
import { ASSETS, FACTOR_META, defaultDealMonth } from "./housing";
export type Mode = "demo" | "live";
export type StopId = "around" | "route" | "entrance";
export type StageId = "prep" | "visit" | "summary";
export type CandidateSource = "demo" | "user-confirmed";
export type ObservationSource = "user" | "provider" | "hypothetical";
export type { SimState };
export const STOPS: { id: StopId; label: string; topic: string }[] = [
  { id: "around", label: "Street", topic: "Alley brightness, noise, and sidewalk checks" },
  { id: "route", label: "Daily route", topic: "Station, grocery, and bus route checks" },
  { id: "entrance", label: "Entrance", topic: "Door, mailbox, and recycling checks" }
];
export interface Coords { lat: number; lng: number; verified: boolean }
export interface Candidate { id: string; nickname: string; address: string; source: CandidateSource; coords: Coords | null; confirmed: boolean }
export interface Observation { id: string; candidateId: string; stopId: StopId; text: string; question: string; sourceType: ObservationSource; sourceUrl: string; sourceDate: string | null; resolved: boolean; updatedAt: string }
export interface VisitMemo { id: string; candidateId: string; text: string; date: string | null; updatedAt: string }
export interface ChangeLogEntry { at: string; note: string }
export interface HousingRegion { lawd_cd: string; name: string; query: string }
export interface TradeRecord { name: string; district: string; area_m2: number; floor: number; price_10k: number; deal_date: string; build_year: number | null; deal_type: string }
export interface HousingTrades { items: TradeRecord[]; sample_count: number; median_price_10k: number | null; min_price_10k: number | null; max_price_10k: number | null; deal_ymd: string; asset: string; lawd_cd: string; fetchedAt: string; source: string }
export type FactorEvidence = "missing" | "unverified" | "user-observed" | "linked-source";
export interface FactorState { id: string; weight: number; note: string; evidence: FactorEvidence; sourceUrl: string; sourceDate: string | null }
export interface ScenarioInput { priceM: number; cashM: number; annualRate: number; termYears: number; monthlyFees: number; commuteMin: number; workdays: number; yearsAhead: number; childAge: number | null; improveMin: number; openingYear: number | null; growthPct: number; newSupply: boolean; transitTheme: boolean }
export interface ScenarioSnapshot { id: string; homeId: string; input: ScenarioInput; createdAt: string; label: string }
export interface HousingState { region: HousingRegion | null; month: string; asset: string; trades: HousingTrades | null; tradesStatus: string; factors: FactorState[]; scenarios: ScenarioSnapshot[]; scenarioDraft: ScenarioInput | null; scenarioDrafts?: Record<string, ScenarioInput>; homeFactors?: Record<string, FactorState[]>; factorProfile?: string }
export interface Session { version: 1; mode: Mode; candidates: Candidate[]; activeCandidateId: string; activeStopId: StopId; priorities: string[]; initialQuestions: string; observations: Observation[]; visitNotes: string; visitMemos?: VisitMemo[]; changeLog?: ChangeLogEntry[]; complete: boolean; updatedAt: string; stage?: StageId; simulation?: SimState; housing?: HousingState }
export const PRIORITY_OPTIONS: string[] = ["Commute", "Groceries", "Evening walk", "Building access"];
export const LEGACY_PRIORITY_MAP: Record<string, string> = { "통근 동선": "Commute", "장보기": "Groceries", "밤 귀가 확인": "Evening walk", "건물 접근": "Building access" };
export function migratePriority(p: unknown): string | null {
  if (typeof p !== "string") return null;
  if ((PRIORITY_OPTIONS as string[]).includes(p)) return p;
  const mapped = LEGACY_PRIORITY_MAP[p];
  if (mapped) return mapped;
  return null;
}
export const LIMITS = { candidates: 2, priorities: 3, observations: 200, textLen: 2000, jsonBytes: 200 * 1024, visitNotesLen: 5000, nickLen: 40, addrLen: 120, idLen: 60, memos: 20, logLen: 30, trades: 20, scenarios: 20, factorNote: 2000 };
const BANNED: string[] = ["안전합니다", "안전함", "사기 아님", "투자 수익", "범죄율", "대출 가능", "법적 권리 보장", "시세 상승", "guaranteed safe", "no fraud", "guaranteed return", "crime rate", "loan approved", "legally guaranteed", "prices will rise", "100% safe"];
export function containsBannedClaim(s: string): boolean { if (typeof s !== "string") return false; const low = s.toLowerCase(); return BANNED.some((b) => s.includes(b) || low.includes(b.toLowerCase())); }
export function uid(prefix: string): string { return prefix + "-" + Math.random().toString(36).slice(2, 9); }
export function sourceTypeLabel(t: ObservationSource): string { if (t === "hypothetical") return "Hypothetical (fictional)"; if (t === "provider") return "Provider material"; return "My note"; }
export function evidenceLabel(e: FactorEvidence): string { if (e === "linked-source") return "linked"; if (e === "user-observed") return "self-reported"; if (e === "unverified") return "unverified"; return "missing"; }
export function defaultScenario(): ScenarioInput {
  const y = new Date().getFullYear();
  return { priceM: 855, cashM: 200, annualRate: 4, termYears: 30, monthlyFees: 0.15, commuteMin: 45, workdays: 21, yearsAhead: 5, childAge: null, improveMin: 10, openingYear: y + 3, growthPct: 0, newSupply: false, transitTheme: false };
}
export function isDefaultScenario(v: ScenarioInput): boolean {
  const d = defaultScenario();
  return v.priceM === d.priceM && v.cashM === d.cashM && v.annualRate === d.annualRate && v.termYears === d.termYears && v.monthlyFees === d.monthlyFees && v.commuteMin === d.commuteMin && v.workdays === d.workdays && v.yearsAhead === d.yearsAhead && v.childAge === d.childAge && v.improveMin === d.improveMin && v.growthPct === d.growthPct && v.newSupply === d.newSupply && v.transitTheme === d.transitTheme;
}
export function emptyHousing(): HousingState {
  return { region: null, month: defaultDealMonth(), asset: "apartment", trades: null, tradesStatus: "", factors: FACTOR_META.map((f) => ({ id: f.id, weight: 1, note: "", evidence: "missing" as FactorEvidence, sourceUrl: "", sourceDate: null })), scenarios: [], scenarioDraft: defaultScenario(), scenarioDrafts: {}, homeFactors: {}, factorProfile: "custom" };
}
export function emptySession(): Session { return { version: 1, mode: "live", candidates: [], activeCandidateId: "", activeStopId: "around", priorities: [], initialQuestions: "", observations: [], visitNotes: "", visitMemos: [], changeLog: [], complete: false, updatedAt: new Date().toISOString(), housing: emptyHousing() }; }
export function isValidHttpUrl(u: string): boolean { if (!u) return true; try { const p = new URL(u); if (p.protocol !== "http:" && p.protocol !== "https:") return false; if (p.username || p.password) return false; if (!p.hostname) return false; if (/\s/.test(u)) return false; return true; } catch { return false; } }
export function validUrl(u: string): boolean { return isValidHttpUrl(u); }
export function isValidDateString(v: string | null): boolean { if (v === null) return true; if (typeof v !== "string") return false; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; const parts: number[] = v.split("-").map(Number); const y: number = parts[0]; const m: number = parts[1]; const d: number = parts[2]; if (m < 1 || m > 12 || d < 1 || d > 31) return false; const dt: Date = new Date(Date.UTC(y, m - 1, d)); return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d; }
export function isValidTimestamp(v: string): boolean { if (v === "") return true; if (typeof v !== "string" || !v) return false; return !Number.isNaN(Date.parse(v)); }
export function isValidCoords(c: unknown): c is Coords { if (!c || typeof c !== "object") return false; const v = c as Record<string, unknown>; return (typeof v.lat === "number" && Number.isFinite(v.lat) && v.lat >= -90 && v.lat <= 90 && typeof v.lng === "number" && Number.isFinite(v.lng) && v.lng >= -180 && v.lng <= 180 && typeof v.verified === "boolean"); }
export function stopLabel(id: StopId): string { return STOPS.find((s) => s.id === id)?.label ?? "Unknown stop"; }
export function observationsFor(s: Session, candidateId: string, stopId?: StopId): Observation[] { return s.observations.filter((o) => o.candidateId === candidateId && (!stopId || o.stopId === stopId)); }
export function openQuestions(s: Session, candidateId?: string, limit = 3): Observation[] { let list: Observation[] = s.observations.filter((o) => !o.resolved && o.question.trim().length > 0); if (candidateId) list = list.filter((o) => o.candidateId === candidateId); const scored: { o: Observation; hit: number }[] = list.map((o) => ({ o, hit: s.priorities.some((p) => (o.question + " " + o.text).includes(p)) ? 0 : 1 })); scored.sort((a, b) => a.hit - b.hit); return scored.map((x) => x.o).slice(0, limit); }
export interface Summary { learned: string[]; open: string[]; askVisit: string[] }
export function summarize(s: Session, candidateId?: string): Summary { const scope: Observation[] = candidateId ? s.observations.filter((o) => o.candidateId === candidateId) : s.observations; const nick = (id: string): string => s.candidates.find((c) => c.id === id)?.nickname ?? "home"; const learned: string[] = scope.filter((o) => o.resolved && o.text.trim()).map((o) => o.text).slice(0, 8); const open: string[] = scope.filter((o) => !o.resolved && o.question.trim()).map((o) => o.question + " (" + nick(o.candidateId) + "·" + stopLabel(o.stopId) + ")").slice(0, 8); const gaps: string[] = ["Night-time noise and brightness are not verified", "Interior condition (condensation, water pressure) is not verified"]; const askVisit: string[] = [...open.slice(0, 3), ...gaps.filter((g) => !open.includes(g))].slice(0, 5); return { learned, open, askVisit }; }
export function missingStopsFor(s: Session, candidateId: string): { id: StopId; label: string; topic: string }[] { return STOPS.filter((st) => !s.observations.some((o) => o.candidateId === candidateId && o.stopId === st.id)); }
export function changedSincePrep(s: Session): string[] { const out: string[] = []; const nick = (id: string): string => s.candidates.find((c) => c.id === id)?.nickname ?? "home"; for (const o of s.observations.slice(-6)) { out.push("New note(" + nick(o.candidateId) + "·" + stopLabel(o.stopId) + "): " + o.text.slice(0, 48)); if (o.question.trim()) out.push("New question(" + nick(o.candidateId) + "): " + o.question.slice(0, 48)); } const memos: VisitMemo[] = s.visitMemos ?? []; for (const m of memos.slice(-2)) out.push("Visit memo(" + nick(m.candidateId) + "): " + m.text.slice(0, 48)); if (s.complete) out.push("Marked complete (separate from resolving every question)"); return out.slice(0, 8); }
export function hasConfirmedCandidate(s: Session): boolean { return s.candidates.some((c) => c.confirmed && c.address.trim().length > 0); }
export function canEnterStage(stage: StageId, s: Session): boolean { if (stage === "prep") return true; return hasConfirmedCandidate(s); }
export function hasWork(s: Session): boolean {
  if (s.observations.length > 0 || s.visitNotes.trim() !== "" || (s.visitMemos ?? []).length > 0) return true;
  const h = s.housing;
  if (!h) return false;
  if ((h.scenarios ?? []).length > 0) return true;
  const drafts = h.scenarioDrafts ?? {};
  for (const k of Object.keys(drafts)) { const d = drafts[k]; if (d && !isDefaultScenario(d)) return true; }
  const hf = h.homeFactors ?? {};
  for (const k of Object.keys(hf)) { const arr = hf[k] ?? []; if (arr.some((f) => f.note.trim() !== "" || f.evidence !== "missing" || f.sourceUrl.trim() !== "")) return true; }
  return false;
}
export function togglePriorityWithLimit(current: string[], p: string): { next: string[]; limited: boolean } { const canon = migratePriority(p) ?? p; if (current.includes(canon)) return { next: current.filter((x) => x !== canon), limited: false }; if (current.length >= LIMITS.priorities) return { next: current, limited: true }; return { next: [...current, canon], limited: false }; }
export function deriveProfile(factors: FactorState[]): string {
  const w: Record<string, number> = {};
  for (const f of factors) w[f.id] = f.weight;
  const { PROFILES } = requireProfiles();
  for (const k of Object.keys(PROFILES)) {
    const pw = PROFILES[k].weights as Record<string, number>;
    let ok = true;
    for (const m of FACTOR_META) { const want = pw[m.id] ?? 1; if ((w[m.id] ?? 1) !== want) { ok = false; break; } }
    if (ok) return k;
  }
  return "custom";
}
function requireProfiles(): { PROFILES: Record<string, { label: string; weights: Record<string, number> }> } {
  return { PROFILES: { commuter: { label: "Commuter", weights: { commute: 3, transit: 3, groceries: 2, cost: 2, noise: 1 } }, family: { label: "Family", weights: { schools: 3, parks: 2, groceries: 2, terrain: 2, building: 2, cost: 2 } }, firsthome: { label: "First home", weights: { cost: 3, title: 3, building: 2, commute: 2, development: 1 } } } };
}
export function draftFor(h: HousingState, homeId: string): ScenarioInput {
  const d = (h.scenarioDrafts ?? {})[homeId];
  if (d) return d;
  const keys = Object.keys(h.scenarioDrafts ?? {});
  if (h.scenarioDraft && keys.length === 0 && !isDefaultScenario(h.scenarioDraft)) return h.scenarioDraft;
  return defaultScenario();
}
export function homeFactorsFor(h: HousingState, homeId: string): FactorState[] {
  const arr = (h.homeFactors ?? {})[homeId];
  if (arr) return arr;
  return FACTOR_META.map((m) => { const g = h.factors.find((f) => f.id === m.id); return { id: m.id, weight: g?.weight ?? 1, note: "", evidence: "missing" as FactorEvidence, sourceUrl: "", sourceDate: null }; });
}
export function pruneHousingForCandidates(h: HousingState, ids: string[]): HousingState {
  const set = new Set(ids);
  const scenarios = (h.scenarios ?? []).filter((s) => set.has(s.homeId));
  const drafts: Record<string, ScenarioInput> = {};
  for (const k of Object.keys(h.scenarioDrafts ?? {})) if (set.has(k)) drafts[k] = (h.scenarioDrafts as Record<string, ScenarioInput>)[k];
  const hf: Record<string, FactorState[]> = {};
  for (const k of Object.keys(h.homeFactors ?? {})) if (set.has(k)) hf[k] = (h.homeFactors as Record<string, FactorState[]>)[k];
  return { ...h, scenarios, scenarioDrafts: drafts, homeFactors: hf };
}
function migrateDemoCandidate(c: Candidate): Candidate {
  if (c.id !== "demo-a" && c.id !== "demo-b") return c;
  let nickname = c.nickname;
  let address = c.address;
  if (c.id === "demo-a" && (nickname === "해르집" || nickname === "해뜰집" || !nickname.trim())) nickname = "Sunlit House";
  if (c.id === "demo-b" && (nickname === "달빛집" || !nickname.trim())) nickname = "Moonlight House";
  if (c.id === "demo-a" || c.id === "demo-b") {
    address = address.replace(/솔안마을\(가상\)/g, "Solan Village (fictional)").replace(/솔안마을/g, "Solan Village").replace(/해르길/g, "Sunlit Lane").replace(/해뜰길/g, "Sunlit Lane").replace(/달빛길/g, "Moonlight Lane");
  }
  return { ...c, nickname, address };
}
function withHousing(prev: Session, keep: boolean, nextIds?: string[]): HousingState | undefined {
  if (!keep) return emptyHousing();
  const h = prev.housing;
  if (!h || typeof h !== "object") return emptyHousing();
  const chk = validateHousing(h);
  const base = chk.ok && chk.housing ? chk.housing : emptyHousing();
  if (nextIds) return pruneHousingForCandidates(base, nextIds);
  return base;
}
export function startDemoSession(prev: Session): Session { const rawPri: string[] = prev.priorities.length ? prev.priorities.slice(0, 3) : ["Commute", "Evening walk"]; const pri: string[] = rawPri.map((p) => migratePriority(p) ?? "Commute").filter((v, i, a) => a.indexOf(v) === i).slice(0, 3); return { version: 1, mode: "demo", candidates: [{ id: "demo-a", nickname: "Sunlit House", address: "Solan Village (fictional) Sunlit Lane 1", source: "demo", coords: null, confirmed: true }, { id: "demo-b", nickname: "Moonlight House", address: "Solan Village (fictional) Moonlight Lane 2", source: "demo", coords: null, confirmed: true }], activeCandidateId: "demo-a", activeStopId: "around", priorities: pri, initialQuestions: prev.initialQuestions.slice(0, LIMITS.textLen), observations: [], visitNotes: "", visitMemos: [], changeLog: [], complete: false, updatedAt: new Date().toISOString(), simulation: prev.simulation ? validateSimState(prev.simulation).sim ?? { ...DEFAULT_SIM } : { ...DEFAULT_SIM }, housing: withHousing(prev, true, ["demo-a", "demo-b"]) }; }
export function startLiveSession(prev: Session, cands: Candidate[]): Session { const oldById = new Map<string, string>(prev.candidates.map((c) => [c.id, c.address.trim()])); const addressOf = (id: string): string | undefined => cands.find((c) => c.id === id)?.address.trim(); const sameAddress = (id: string): boolean => oldById.get(id) === addressOf(id); const keepObs: Observation[] = prev.mode === "live" ? prev.observations.filter((o) => cands.some((c) => c.id === o.candidateId) && sameAddress(o.candidateId)) : []; const keepMemos: VisitMemo[] = prev.mode === "live" ? (prev.visitMemos ?? []).filter((m) => cands.some((c) => c.id === m.candidateId) && sameAddress(m.candidateId)) : []; const canonPri = prev.priorities.map((p) => migratePriority(p) ?? p).filter((v, i, a) => PRIORITY_OPTIONS.includes(v) && a.indexOf(v) === i).slice(0, 3); const ids = cands.map((c) => c.id); let housing = withHousing(prev, true, ids); if (housing && prev.mode !== "live") { housing = { ...housing, scenarios: [], scenarioDrafts: {}, homeFactors: {} }; } else if (housing) { const changed = cands.some((c) => !sameAddress(c.id)) || prev.candidates.length !== cands.length; if (changed) { const keepRegion = housing.region; const keepMonth = housing.month; const keepAsset = housing.asset; const keepTrades = housing.trades; const keepStatus = housing.tradesStatus; const keepFactors = housing.factors; housing = { ...housing, region: keepRegion, month: keepMonth, asset: keepAsset, trades: keepTrades, tradesStatus: keepStatus, factors: keepFactors, scenarios: [], scenarioDrafts: {}, homeFactors: {} }; } } return { version: 1, mode: "live", candidates: cands, activeCandidateId: cands[0]?.id ?? "", activeStopId: prev.activeStopId ?? "around", priorities: canonPri, initialQuestions: prev.initialQuestions.slice(0, LIMITS.textLen), observations: keepObs, visitNotes: keepObs.length ? prev.visitNotes.slice(0, LIMITS.visitNotesLen) : "", visitMemos: keepMemos, changeLog: (prev.changeLog ?? []).slice(-LIMITS.logLen), complete: false, updatedAt: new Date().toISOString(), simulation: prev.simulation ? validateSimState(prev.simulation).sim ?? { ...DEFAULT_SIM } : undefined, housing }; }
export function byteSize(s: Session): number { try { return new TextEncoder().encode(JSON.stringify(s)).length; } catch { return JSON.stringify(s).length; } }
function isRecord(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object" && !Array.isArray(v); }
function hasBadKeys(v: unknown): boolean { const seen = new Set<unknown>(); const stack: unknown[] = [v]; while (stack.length) { const cur: unknown = stack.pop(); if (!cur || typeof cur !== "object") continue; if (seen.has(cur)) continue; seen.add(cur); if (Array.isArray(cur)) { for (const el of cur) stack.push(el); continue; } const rec = cur as Record<string, unknown>; for (const k of Object.keys(rec)) { if (k === "__proto__" || k === "constructor" || k === "prototype") return true; stack.push(rec[k]); } } return false; }
function validateChangeLog(raw: unknown): { ok: boolean; entries?: ChangeLogEntry[]; error?: string } { if (raw === undefined) return { ok: true, entries: [] }; if (!Array.isArray(raw)) return { ok: false, error: "Change history is invalid." }; if (raw.length > LIMITS.logLen) return { ok: false, error: "Change history exceeds the limit." }; const out: ChangeLogEntry[] = []; for (const e of raw) { if (!isRecord(e)) return { ok: false, error: "Change history is invalid." }; const at: unknown = e.at; const note: unknown = e.note; if (typeof at !== "string" || !at || !isValidTimestamp(at)) return { ok: false, error: "Change history time is invalid." }; if (typeof note !== "string" || !note.trim() || note.length > LIMITS.textLen) return { ok: false, error: "Change history text is invalid." }; out.push({ at, note }); } return { ok: true, entries: out }; }
function validateFactorRow(fr: Record<string, unknown>): { ok: boolean; error?: string } {
  if (typeof fr.id !== "string" || !FACTOR_META.some((m) => m.id === fr.id)) return { ok: false, error: "A factor id is invalid." };
  if (typeof fr.weight !== "number" || !Number.isInteger(fr.weight) || (fr.weight as number) < 0 || (fr.weight as number) > 3) return { ok: false, error: "Factor weight is invalid." };
  if (typeof fr.note !== "string" || (fr.note as string).length > LIMITS.factorNote) return { ok: false, error: "A factor note exceeds the limit." };
  if (fr.evidence !== "missing" && fr.evidence !== "unverified" && fr.evidence !== "user-observed" && fr.evidence !== "linked-source") return { ok: false, error: "Factor evidence is invalid." };
  if (typeof fr.sourceUrl !== "string" || !isValidHttpUrl(fr.sourceUrl)) return { ok: false, error: "Factor source URL must start with http(s)." };
  if (!isValidDateString(fr.sourceDate as string | null)) return { ok: false, error: "Factor source date is invalid." };
  if (fr.evidence === "linked-source" && !(fr.sourceUrl as string).trim()) return { ok: false, error: "A linked factor needs a URL." };
  if (fr.evidence === "user-observed" && !(fr.note as string).trim()) return { ok: false, error: "A self-reported factor needs a note." };
  return { ok: true };
}
export function validateHousing(raw: unknown): { ok: boolean; housing?: HousingState; error?: string } {
  if (raw === undefined || raw === null) return { ok: true, housing: emptyHousing() };
  if (!isRecord(raw)) return { ok: false, error: "Housing plan is invalid." };
  const r = raw as Record<string, unknown>;
  let region: HousingRegion | null = null;
  if (r.region !== null && r.region !== undefined) {
    if (!isRecord(r.region)) return { ok: false, error: "Region is invalid." };
    const g = r.region as Record<string, unknown>;
    if (typeof g.lawd_cd !== "string" || !/^\d{5}$/.test(g.lawd_cd)) return { ok: false, error: "Region code is invalid." };
    if (typeof g.name !== "string" || !g.name.trim() || g.name.length > 120) return { ok: false, error: "Region name is invalid." };
    if (typeof g.query !== "string" || g.query.length > 30) return { ok: false, error: "Region query is invalid." };
    region = { lawd_cd: g.lawd_cd, name: g.name, query: g.query };
  }
  if (typeof r.month !== "string" || !/^\d{6}$/.test(r.month)) return { ok: false, error: "Housing month is invalid." };
  const mm = Number(r.month.slice(4, 6));
  if (mm < 1 || mm > 12) return { ok: false, error: "Housing month is invalid." };
  if (typeof r.asset !== "string" || !(ASSETS as readonly string[]).includes(r.asset)) return { ok: false, error: "Asset type is invalid." };
  let trades: HousingTrades | null = null;
  if (r.trades !== null && r.trades !== undefined) {
    if (!isRecord(r.trades)) return { ok: false, error: "Trades are invalid." };
    const t = r.trades as Record<string, unknown>;
    if (!Array.isArray(t.items) || t.items.length > LIMITS.trades) return { ok: false, error: "Stored trades exceed the limit (20)." };
    const items: TradeRecord[] = [];
    for (const it of t.items) {
      if (!isRecord(it)) return { ok: false, error: "A trade is invalid." };
      const q = it as Record<string, unknown>;
      if (typeof q.name !== "string" || !q.name.trim() || q.name.length > 120) return { ok: false, error: "A trade name is invalid." };
      if (typeof q.district !== "string" || q.district.length > 60) return { ok: false, error: "A trade district is invalid." };
      if (typeof q.area_m2 !== "number" || !Number.isFinite(q.area_m2) || q.area_m2 < 1 || q.area_m2 > 1000) return { ok: false, error: "A trade area is invalid." };
      if (typeof q.floor !== "number" || !Number.isFinite(q.floor) || q.floor < -5 || q.floor > 100) return { ok: false, error: "A trade floor is invalid." };
      if (typeof q.price_10k !== "number" || !Number.isFinite(q.price_10k) || q.price_10k < 10 || q.price_10k > 10000000) return { ok: false, error: "A trade price is invalid." };
      if (typeof q.deal_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(q.deal_date) || !isValidDateString(q.deal_date)) return { ok: false, error: "A trade date is invalid." };
      if (q.build_year !== null && (typeof q.build_year !== "number" || !Number.isInteger(q.build_year) || q.build_year < 1900 || q.build_year > 2035)) return { ok: false, error: "A trade build year is invalid." };
      if (typeof q.deal_type !== "string" || q.deal_type.length > 40) return { ok: false, error: "A trade type is invalid." };
      items.push({ name: q.name, district: q.district, area_m2: q.area_m2, floor: q.floor, price_10k: q.price_10k, deal_date: q.deal_date, build_year: q.build_year, deal_type: q.deal_type });
    }
    const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : typeof v === "number" && Number.isFinite(v) ? v : NaN as unknown as null);
    const med = numOrNull(t.median_price_10k); const mn = numOrNull(t.min_price_10k); const mx = numOrNull(t.max_price_10k);
    if (med !== null && !(med as number >= 0)) return { ok: false, error: "Trade summary is invalid." };
    if (typeof t.sample_count !== "number" || !Number.isInteger(t.sample_count) || t.sample_count < 0 || t.sample_count > 100000) return { ok: false, error: "Trade sample count is invalid." };
    if (typeof t.deal_ymd !== "string" || !/^\d{6}$/.test(t.deal_ymd)) return { ok: false, error: "Trade month is invalid." };
    if (typeof t.lawd_cd !== "string" || !/^\d{5}$/.test(t.lawd_cd)) return { ok: false, error: "Trade region is invalid." };
    if (typeof t.asset !== "string" || !(ASSETS as readonly string[]).includes(t.asset)) return { ok: false, error: "Trade asset is invalid." };
    if (typeof t.fetchedAt !== "string" || !isValidTimestamp(t.fetchedAt)) return { ok: false, error: "Trade fetch time is invalid." };
    if (typeof t.source !== "string" || t.source.length > 300) return { ok: false, error: "Trade source is invalid." };
    trades = { items, sample_count: t.sample_count as number, median_price_10k: med, min_price_10k: mn, max_price_10k: mx, deal_ymd: t.deal_ymd as string, asset: t.asset as string, lawd_cd: t.lawd_cd as string, fetchedAt: t.fetchedAt as string, source: t.source as string };
  }
  if (typeof r.tradesStatus !== "string" || r.tradesStatus.length > 500) return { ok: false, error: "Trades status is invalid." };
  if (!Array.isArray(r.factors) || r.factors.length > 12) return { ok: false, error: "Factors exceed the limit." };
  const seenF = new Set<string>();
  const factors: FactorState[] = [];
  for (const f of r.factors as unknown[]) {
    if (!isRecord(f)) return { ok: false, error: "A factor is invalid." };
    const chk = validateFactorRow(f as Record<string, unknown>);
    if (!chk.ok) return { ok: false, error: chk.error };
    const fr = f as Record<string, unknown>;
    if (seenF.has(fr.id as string)) return { ok: false, error: "Factor ids are duplicated." };
    seenF.add(fr.id as string);
    factors.push({ id: fr.id as string, weight: fr.weight as number, note: fr.note as string, evidence: fr.evidence as FactorEvidence, sourceUrl: fr.sourceUrl as string, sourceDate: (fr.sourceDate as string | null) ?? null });
  }
  if (!Array.isArray(r.scenarios) || r.scenarios.length > LIMITS.scenarios) return { ok: false, error: "Scenarios exceed the limit." };
  const sids = new Set<string>();
  for (const sc of r.scenarios as unknown[]) {
    if (!isRecord(sc)) return { ok: false, error: "A scenario is invalid." };
    const sr = sc as Record<string, unknown>;
    if (typeof sr.id !== "string" || !sr.id.trim() || sr.id.length > LIMITS.idLen) return { ok: false, error: "Scenario id is invalid." };
    if (sids.has(sr.id)) return { ok: false, error: "Scenario ids are duplicated." };
    sids.add(sr.id);
    if (typeof sr.homeId !== "string" || !sr.homeId.trim() || sr.homeId.length > LIMITS.idLen) return { ok: false, error: "Scenario home is invalid." };
    if (typeof sr.label !== "string" || sr.label.length > 120) return { ok: false, error: "Scenario label is invalid." };
    if (typeof sr.createdAt !== "string" || !isValidTimestamp(sr.createdAt)) return { ok: false, error: "Scenario time is invalid." };
    const chkI = validateScenarioInput(sr.input);
    if (!chkI.ok) return { ok: false, error: chkI.error };
  }
  if (r.scenarioDraft !== null && r.scenarioDraft !== undefined) {
    const chkD = validateScenarioInput(r.scenarioDraft);
    if (!chkD.ok) return { ok: false, error: chkD.error };
  }
  let drafts: Record<string, ScenarioInput> = {};
  if (r.scenarioDrafts !== undefined && r.scenarioDrafts !== null) {
    if (!isRecord(r.scenarioDrafts)) return { ok: false, error: "Scenario drafts are invalid." };
    const keys = Object.keys(r.scenarioDrafts);
    if (keys.length > 2) return { ok: false, error: "Scenario drafts exceed two homes." };
    for (const k of keys) {
      if (!k.trim() || k.length > LIMITS.idLen) return { ok: false, error: "Scenario draft home is invalid." };
      const chk = validateScenarioInput((r.scenarioDrafts as Record<string, unknown>)[k]);
      if (!chk.ok) return { ok: false, error: chk.error };
      drafts[k] = (r.scenarioDrafts as Record<string, ScenarioInput>)[k];
    }
  }
  let hf: Record<string, FactorState[]> = {};
  if (r.homeFactors !== undefined && r.homeFactors !== null) {
    if (!isRecord(r.homeFactors)) return { ok: false, error: "Home factors are invalid." };
    const keys = Object.keys(r.homeFactors);
    if (keys.length > 2) return { ok: false, error: "Home factors exceed two homes." };
    for (const k of keys) {
      if (!k.trim() || k.length > LIMITS.idLen) return { ok: false, error: "Home factor home is invalid." };
      const arr = (r.homeFactors as Record<string, unknown>)[k];
      if (!Array.isArray(arr) || arr.length > 12) return { ok: false, error: "Home factors exceed the limit." };
      const seen = new Set<string>(); const out: FactorState[] = [];
      for (const f of arr as unknown[]) {
        if (!isRecord(f)) return { ok: false, error: "A home factor is invalid." };
        const chk = validateFactorRow(f as Record<string, unknown>);
        if (!chk.ok) return { ok: false, error: chk.error };
        const fr = f as Record<string, unknown>;
        if (seen.has(fr.id as string)) return { ok: false, error: "Home factor ids are duplicated." };
        seen.add(fr.id as string);
        out.push({ id: fr.id as string, weight: fr.weight as number, note: fr.note as string, evidence: fr.evidence as FactorEvidence, sourceUrl: fr.sourceUrl as string, sourceDate: (fr.sourceDate as string | null) ?? null });
      }
      hf[k] = out;
    }
  }
  let profile = "custom";
  if (r.factorProfile !== undefined && r.factorProfile !== null) {
    if (typeof r.factorProfile !== "string" || r.factorProfile.length > 20) return { ok: false, error: "Factor profile is invalid." };
    profile = r.factorProfile;
  } else { profile = deriveProfile(factors); }
  return { ok: true, housing: { region, month: r.month as string, asset: r.asset as string, trades, tradesStatus: r.tradesStatus as string, factors, scenarios: r.scenarios as ScenarioSnapshot[], scenarioDraft: (r.scenarioDraft as ScenarioInput | null) ?? null, scenarioDrafts: drafts, homeFactors: hf, factorProfile: profile } };
}
export function validateScenarioInput(v: unknown): { ok: boolean; error?: string } {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "Scenario is invalid." };
  const r = v as Record<string, unknown>;
  const num = (k: string, lo: number, hi: number): boolean => typeof r[k] === "number" && Number.isFinite(r[k] as number) && (r[k] as number) >= lo && (r[k] as number) <= hi;
  if (!num("priceM", 0, 100000)) return { ok: false, error: "Scenario price is invalid." };
  if (!num("cashM", 0, 100000)) return { ok: false, error: "Scenario cash is invalid." };
  if (!num("annualRate", 0, 30)) return { ok: false, error: "Scenario rate is invalid." };
  if (!num("termYears", 1, 50) || !Number.isInteger(r.termYears as number)) return { ok: false, error: "Scenario term is invalid." };
  if (!num("monthlyFees", 0, 1000)) return { ok: false, error: "Scenario fees are invalid." };
  if (!num("commuteMin", 0, 300)) return { ok: false, error: "Scenario commute is invalid." };
  if (!num("workdays", 0, 31) || !Number.isInteger(r.workdays as number)) return { ok: false, error: "Scenario workdays are invalid." };
  if (!num("yearsAhead", 1, 10) || !Number.isInteger(r.yearsAhead as number)) return { ok: false, error: "Scenario horizon is invalid." };
  if (r.childAge !== null && r.childAge !== undefined && (typeof r.childAge !== "number" || !Number.isInteger(r.childAge as number) || (r.childAge as number) < 0 || (r.childAge as number) > 30)) return { ok: false, error: "Scenario child age is invalid." };
  if (!num("improveMin", 0, 120)) return { ok: false, error: "Scenario improvement is invalid." };
  if (typeof r.improveMin === "number" && typeof r.commuteMin === "number" && (r.improveMin as number) > (r.commuteMin as number)) return { ok: false, error: "Scenario improvement exceeds commute." };
  if (r.openingYear !== null && r.openingYear !== undefined && (typeof r.openingYear !== "number" || !Number.isInteger(r.openingYear as number) || (r.openingYear as number) < 2020 || (r.openingYear as number) > 2060)) return { ok: false, error: "Scenario opening year is invalid." };
  if (!num("growthPct", -5, 5)) return { ok: false, error: "Scenario growth is invalid." };
  if (typeof r.newSupply !== "boolean" || typeof r.transitTheme !== "boolean") return { ok: false, error: "Scenario toggles are invalid." };
  return { ok: true };
}
export function validateImport(raw: unknown): { ok: boolean; session?: Session; error?: string } { try { const v: unknown = typeof raw === "string" ? JSON.parse(raw) : raw; if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "A JSON object is required." }; if (hasBadKeys(v)) return { ok: false, error: "Blocked entry found, import refused." }; const s = v as Session; if (s.version !== 1) return { ok: false, error: "Unsupported record version." }; if (s.mode !== "demo" && s.mode !== "live") return { ok: false, error: "Mode is invalid." }; if (!Array.isArray(s.candidates) || s.candidates.length > LIMITS.candidates) return { ok: false, error: "At most two homes can be compared." }; if (!Array.isArray(s.observations) || s.observations.length > LIMITS.observations) return { ok: false, error: "Observation records exceed the limit." }; if (typeof s.activeCandidateId !== "string") return { ok: false, error: "Selected home is invalid." }; if (!STOPS.some((t) => t.id === s.activeStopId)) return { ok: false, error: "Observation stop is invalid." }; if (!Array.isArray(s.priorities) || s.priorities.length > LIMITS.priorities) return { ok: false, error: "At most three priorities." }; const seenPri = new Set<string>(); const canonPri: string[] = []; for (const p of s.priorities) { const m = migratePriority(p); if (!m) return { ok: false, error: "A priority is invalid." }; if (seenPri.has(m)) return { ok: false, error: "Priorities are duplicated." }; seenPri.add(m); canonPri.push(m); } if (typeof s.initialQuestions !== "string" || s.initialQuestions.length > LIMITS.textLen) return { ok: false, error: "Initial questions exceed the limit." }; if (typeof s.visitNotes !== "string" || s.visitNotes.length > LIMITS.visitNotesLen) return { ok: false, error: "Visit notes exceed the limit." }; if (typeof s.complete !== "boolean") return { ok: false, error: "Completion flag is invalid." }; if (typeof s.updatedAt !== "string" || !isValidTimestamp(s.updatedAt) || s.updatedAt === "") return { ok: false, error: "Update time is invalid." }; if (s.stage !== undefined && s.stage !== "prep" && s.stage !== "visit" && s.stage !== "summary") return { ok: false, error: "Saved step is invalid." }; const ids = new Set<string>(); const canonCands: Candidate[] = []; for (const c of s.candidates) { if (!isRecord(c)) return { ok: false, error: "Home info is invalid." }; const cc = c as unknown as Candidate; if (typeof cc.id !== "string" || !cc.id.trim() || cc.id.length > LIMITS.idLen) return { ok: false, error: "Home id is invalid." }; if (ids.has(cc.id)) return { ok: false, error: "Home ids are duplicated." }; ids.add(cc.id); if (typeof cc.nickname !== "string" || !cc.nickname.trim() || cc.nickname.length > LIMITS.nickLen) return { ok: false, error: "Home nickname is invalid." }; if (typeof cc.address !== "string" || !cc.address.trim() || cc.address.length > LIMITS.addrLen) return { ok: false, error: "Home address is invalid." }; if (cc.source !== "demo" && cc.source !== "user-confirmed") return { ok: false, error: "Home source is invalid." }; if (cc.coords !== null && !isValidCoords(cc.coords)) return { ok: false, error: "Coordinates are invalid." }; if (typeof cc.confirmed !== "boolean") return { ok: false, error: "Address confirmation flag is invalid." }; if (s.mode === "demo" && cc.source !== "demo") return { ok: false, error: "Demo records cannot mix real-address sources." }; if (s.mode === "live" && cc.source !== "user-confirmed") return { ok: false, error: "My-address records cannot mix fictional sources." }; canonCands.push(migrateDemoCandidate(cc)); } if (s.candidates.length === 0) { if (s.activeCandidateId !== "") return { ok: false, error: "Selected home is invalid." }; } else if (!ids.has(s.activeCandidateId)) return { ok: false, error: "Selected home is not in the list." }; const oids = new Set<string>(); for (const o of s.observations) { if (!isRecord(o)) return { ok: false, error: "An observation is invalid." }; const oo = o as unknown as Observation; if (typeof oo.id !== "string" || !oo.id.trim() || oo.id.length > LIMITS.idLen) return { ok: false, error: "Observation id is invalid." }; if (oids.has(oo.id)) return { ok: false, error: "Observation ids are duplicated." }; oids.add(oo.id); if (!ids.has(oo.candidateId)) return { ok: false, error: "An observation points to an unknown home." }; if (!STOPS.some((t) => t.id === oo.stopId)) return { ok: false, error: "Observation stop is invalid." }; if (typeof oo.text !== "string" || !oo.text.trim() || oo.text.length > LIMITS.textLen) return { ok: false, error: "Observation text is invalid." }; if (typeof oo.question !== "string" || oo.question.length > LIMITS.textLen) return { ok: false, error: "Observation question exceeds the limit." }; if (oo.sourceType !== "user" && oo.sourceType !== "provider" && oo.sourceType !== "hypothetical") return { ok: false, error: "Observation source is invalid." }; if (typeof oo.sourceUrl !== "string" || !isValidHttpUrl(oo.sourceUrl)) return { ok: false, error: "Source URL must start with http(s)." }; if (!isValidDateString(oo.sourceDate)) return { ok: false, error: "Source date is invalid." }; if (typeof oo.resolved !== "boolean") return { ok: false, error: "Resolved flag is invalid." }; if (typeof oo.updatedAt !== "string" || !isValidTimestamp(oo.updatedAt)) return { ok: false, error: "Observation time is invalid." }; if (s.mode === "demo" && oo.sourceType === "provider") return { ok: false, error: "Demo records cannot mix provider sources." }; if (s.mode === "live" && oo.sourceType === "hypothetical") return { ok: false, error: "My-address records cannot mix fictional notes." }; } const memosRaw: unknown = (s as Session).visitMemos ?? []; if (!Array.isArray(memosRaw) || memosRaw.length > LIMITS.memos) return { ok: false, error: "Visit memos exceed the limit." }; const mids = new Set<string>(); for (const m of memosRaw) { if (!isRecord(m)) return { ok: false, error: "A visit memo is invalid." }; const mm = m as unknown as VisitMemo; if (typeof mm.id !== "string" || !mm.id.trim() || mm.id.length > LIMITS.idLen) return { ok: false, error: "Visit memo id is invalid." }; if (mids.has(mm.id)) return { ok: false, error: "Visit memo ids are duplicated." }; mids.add(mm.id); if (!ids.has(mm.candidateId)) return { ok: false, error: "A memo points to an unknown home." }; if (typeof mm.text !== "string" || !mm.text.trim() || mm.text.length > LIMITS.textLen) return { ok: false, error: "Visit memo text is invalid." }; if (!isValidDateString(mm.date)) return { ok: false, error: "Visit memo date is invalid." }; if (typeof mm.updatedAt !== "string" || !isValidTimestamp(mm.updatedAt)) return { ok: false, error: "Visit memo time is invalid." }; } const logCheck = validateChangeLog((s as Session).changeLog); if (!logCheck.ok) return { ok: false, error: logCheck.error }; let simValidated: SimState | undefined; const simRaw: unknown = (s as Session).simulation; if (simRaw !== undefined) { const chk = validateSimState(simRaw); if (!chk.ok || !chk.sim) return { ok: false, error: chk.error ?? "Simulation state is invalid." }; simValidated = chk.sim; } const housingRaw: unknown = (s as Session).housing; let housingValidated: HousingState | undefined; if (housingRaw !== undefined && housingRaw !== null) { const hc = validateHousing(housingRaw); if (!hc.ok || !hc.housing) return { ok: false, error: hc.error ?? "Housing plan is invalid." }; for (const sc of hc.housing.scenarios) { if (!ids.has(sc.homeId)) return { ok: false, error: "Scenario home is unknown." }; } for (const k of Object.keys(hc.housing.scenarioDrafts ?? {})) { if (!ids.has(k)) return { ok: false, error: "Scenario draft home is unknown." }; } for (const k of Object.keys(hc.housing.homeFactors ?? {})) { if (!ids.has(k)) return { ok: false, error: "Home factor home is unknown." }; } if (ids.size === 0) { if (hc.housing.scenarios.length > 0 || Object.keys(hc.housing.scenarioDrafts ?? {}).length > 0 || Object.keys(hc.housing.homeFactors ?? {}).length > 0) return { ok: false, error: "Home data without homes is invalid." }; } housingValidated = hc.housing; } if (byteSize(s) > LIMITS.jsonBytes) return { ok: false, error: "Record size exceeds the limit." }; const canon: Session = { ...s, priorities: canonPri, candidates: canonCands, visitMemos: (memosRaw as VisitMemo[]).map((m) => ({ id: m.id, candidateId: m.candidateId, text: m.text, date: m.date, updatedAt: m.updatedAt })), changeLog: (logCheck.entries ?? []).map((e) => ({ at: e.at, note: e.note })) }; if (simValidated) canon.simulation = simValidated; if (housingValidated) canon.housing = housingValidated; return { ok: true, session: canon }; } catch { return { ok: false, error: "Could not parse JSON." }; } }
export function saveSession(key: string, s: Session, stage?: StageId): void { const next: Session = { ...s, stage: stage ?? s.stage ?? "prep", updatedAt: new Date().toISOString() }; localStorage.setItem(key, JSON.stringify(next)); }
export function restoreSession(key: string): Session | null { try { const raw: string | null = localStorage.getItem(key); if (!raw) return null; const r = validateImport(raw); return r.ok ? (r.session as Session) : null; } catch { return null; } }
export function clearSaved(key: string): void { localStorage.removeItem(key); }