const ID_MAX = 60;
const NICK_MAX = 40;
const ADDR_MAX = 120;
const TEXT_MAX = 2000;
const NOTES_MAX = 5000;
const URL_MAX = 2000;
export const ALLOWED_PRIORITIES: string[] = ['Commute', 'Groceries', 'Evening walk', 'Building access'];
const LEGACY_PRIORITIES: Record<string, string> = { '\ud1b5\uadfc \ub3d9\uc120': 'Commute', '\uc7a5\ubcf4\uae30': 'Groceries', '\ubc24 \uadc0\uac00 \ud655\uc778': 'Evening walk', '\uac74\ubb3c \uc811\uadfc': 'Building access' };
function canonPriority(p: unknown): string | null {
  if (typeof p !== 'string') return null;
  if (ALLOWED_PRIORITIES.includes(p)) return p;
  const m = LEGACY_PRIORITIES[p];
  return m ?? null;
}
export const ALLOWED_STOPS: string[] = ['around', 'route', 'entrance'];
export const ALLOWED_OBS_SOURCES: string[] = ['user', 'provider', 'hypothetical'];
export const ALLOWED_CAND_SOURCES_LOCAL: string[] = ['demo', 'user-confirmed'];
export const ALLOWED_STAGES: string[] = ['prep', 'visit', 'summary'];
const MAX_BYTES = 200 * 1024;
const MAX_CANDS = 2;
const MAX_PRI = 3;
const MAX_OBS = 200;
const MAX_MEMOS = 20;
const MAX_LOG = 30;
const FACTOR_IDS = ['commute','transit','schools','groceries','parks','noise','terrain','building','cost','title','community','development'];
const PROFILE_IDS = ['commuter','family','firsthome','custom'];
function checkFactorRow(fr: Record<string, unknown>): string | null {
  if (typeof fr.id !== 'string' || !FACTOR_IDS.includes(fr.id)) return 'A factor id is invalid.';
  if (typeof fr.weight !== 'number' || !Number.isInteger(fr.weight) || (fr.weight as number) < 0 || (fr.weight as number) > 3) return 'Factor weight is invalid.';
  if (typeof fr.note !== 'string' || (fr.note as string).length > 2000) return 'A factor note exceeds the limit.';
  if (fr.evidence !== 'missing' && fr.evidence !== 'unverified' && fr.evidence !== 'user-observed' && fr.evidence !== 'linked-source') return 'Factor evidence is invalid.';
  if (typeof fr.sourceUrl !== 'string' || !isValidHttpUrl(fr.sourceUrl)) return 'Factor source URL must start with http(s).';
  if (!isValidDateString(fr.sourceDate as string | null)) return 'Factor source date is invalid.';
  if (fr.evidence === 'linked-source' && !(fr.sourceUrl as string).trim()) return 'A linked factor needs a URL.';
  if (fr.evidence === 'user-observed' && !(fr.note as string).trim()) return 'A self-reported factor needs a note.';
  return null;
}
function checkScenarioInput(r: Record<string, unknown>): string | null {
  const num = (k: string, lo: number, hi: number): boolean => typeof r[k] === 'number' && Number.isFinite(r[k] as number) && (r[k] as number) >= lo && (r[k] as number) <= hi;
  if (!num('priceM', 0, 100000)) return 'Scenario price is invalid.';
  if (!num('cashM', 0, 100000)) return 'Scenario cash is invalid.';
  if (!num('annualRate', 0, 30)) return 'Scenario rate is invalid.';
  if (!num('termYears', 1, 50) || !Number.isInteger(r.termYears as number)) return 'Scenario term is invalid.';
  if (!num('monthlyFees', 0, 1000)) return 'Scenario fees are invalid.';
  if (!num('commuteMin', 0, 300)) return 'Scenario commute is invalid.';
  if (!num('workdays', 0, 31) || !Number.isInteger(r.workdays as number)) return 'Scenario workdays are invalid.';
  if (!num('yearsAhead', 1, 10) || !Number.isInteger(r.yearsAhead as number)) return 'Scenario horizon is invalid.';
  if (typeof r.improveMin === 'number' && typeof r.commuteMin === 'number' && (r.improveMin as number) > (r.commuteMin as number)) return 'Scenario improvement exceeds commute.';
  if (!num('growthPct', -5, 5)) return 'Scenario growth is invalid.';
  if (typeof r.newSupply !== 'boolean' || typeof r.transitTheme !== 'boolean') return 'Scenario toggles are invalid.';
  return null;
}
export interface ValidCoords { lat: number; lng: number; verified: boolean; }
export interface ValidCandidate { id: string; nickname: string; address: string; source: string; coords: ValidCoords | null; confirmed: boolean; }
export interface ValidObservation { id: string; candidateId: string; stopId: string; text: string; question: string; sourceType: string; sourceUrl: string; sourceDate: string | null; resolved: boolean; updatedAt: string; }
export interface ValidMemo { id: string; candidateId: string; text: string; date: string | null; updatedAt: string; }
export interface ValidLog { at: string; note: string; }
export interface ValidSim { hour: number; streetLights: boolean; showRoute: boolean; traffic: number; camAngle: number; camZoom: number; walkStep: number; playing: boolean; showTransport?: boolean; showSchools?: boolean; showEveryday?: boolean; }
export interface ValidSession { version?: number; mode: 'demo' | 'live'; candidates: ValidCandidate[]; activeCandidateId: string; activeStopId: string; priorities: string[]; initialQuestions: string; observations: ValidObservation[]; visitNotes?: string; visitMemos?: ValidMemo[]; changeLog?: ValidLog[]; complete?: boolean; updatedAt?: string; stage?: string; simulation?: ValidSim; housing?: unknown; }
export interface ModelQuestion { text: string; reason: string; evidenceIds: string[]; }
function isPlainObject(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' && !Array.isArray(v); }
function clamp(n: number, lo: number, hi: number): number { return Math.min(hi, Math.max(lo, n)); }
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
  } catch { return false; }
}
function isValidDateString(v: unknown): boolean {
  if (v === null) return true;
  if (typeof v !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const parts: number[] = v.split('-').map(Number);
  const y: number = parts[0]; const m: number = parts[1]; const d: number = parts[2];
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt: Date = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
function isValidTimestamp(v: unknown): boolean { if (v === '') return true; if (typeof v !== 'string' || !v) return false; return !Number.isNaN(Date.parse(v)); }
function isValidCoords(c: unknown): c is ValidCoords {
  if (c === null) return true;
  if (!isPlainObject(c)) return false;
  const v = c as Record<string, unknown>;
  return (typeof v.lat === 'number' && Number.isFinite(v.lat) && v.lat >= -90 && v.lat <= 90 && typeof v.lng === 'number' && Number.isFinite(v.lng) && v.lng >= -180 && v.lng <= 180 && typeof v.verified === 'boolean');
}
function validateSim(v: unknown): { ok: boolean; sim?: ValidSim; error?: string } {
  if (v === undefined) return { ok: true, sim: undefined };
  if (!isPlainObject(v)) return { ok: false, error: 'Simulation state is invalid.' };
  const r = v as Record<string, unknown>;
  if (typeof r.hour !== 'number' || !Number.isFinite(r.hour)) return { ok: false, error: 'Simulation hour must be a finite number.' };
  if (typeof r.traffic !== 'number' || !Number.isFinite(r.traffic)) return { ok: false, error: 'Simulation traffic must be a finite number.' };
  if (typeof r.camAngle !== 'number' || !Number.isFinite(r.camAngle)) return { ok: false, error: 'Simulation camera angle must be a finite number.' };
  if (typeof r.camZoom !== 'number' || !Number.isFinite(r.camZoom)) return { ok: false, error: 'Simulation camera zoom must be a finite number.' };
  if (typeof r.walkStep !== 'number' || !Number.isFinite(r.walkStep)) return { ok: false, error: 'Simulation walk step must be a finite number.' };
  if (typeof r.streetLights !== 'boolean') return { ok: false, error: 'Simulation streetLights must be a boolean.' };
  if (typeof r.showRoute !== 'boolean') return { ok: false, error: 'Simulation showRoute must be a boolean.' };
  if (typeof r.playing !== 'boolean') return { ok: false, error: 'Simulation playing must be a boolean.' };
  for (const k of ['showTransport','showSchools','showEveryday']) { if (r[k] !== undefined && typeof r[k] !== 'boolean') return { ok: false, error: 'Simulation layers must be booleans.' }; }
  return { ok: true, sim: { hour: clamp(Math.round(r.hour as number), 6, 23), streetLights: r.streetLights as boolean, showRoute: r.showRoute as boolean, traffic: clamp(Math.round(r.traffic as number), 0, 2), camAngle: clamp(Math.round(r.camAngle as number), -45, 45), camZoom: clamp(r.camZoom as number, 0.5, 1.6), walkStep: clamp(Math.round(r.walkStep as number), 0, 3), playing: r.playing as boolean, showTransport: r.showTransport as boolean | undefined, showSchools: r.showSchools as boolean | undefined, showEveryday: r.showEveryday as boolean | undefined } };
}
function validateHousingServer(v: unknown): { ok: boolean; error?: string } {
  if (v === undefined || v === null) return { ok: true };
  if (!isPlainObject(v)) return { ok: false, error: 'Housing plan is invalid.' };
  const r = v as Record<string, unknown>;
  if (r.region !== null && r.region !== undefined) {
    if (!isPlainObject(r.region)) return { ok: false, error: 'Region is invalid.' };
    const g = r.region as Record<string, unknown>;
    if (typeof g.lawd_cd !== 'string' || !/^\d{5}$/.test(g.lawd_cd)) return { ok: false, error: 'Region code is invalid.' };
    if (typeof g.name !== 'string' || !g.name.trim() || g.name.length > 120) return { ok: false, error: 'Region name is invalid.' };
  }
  if (typeof r.month !== 'string' || !/^\d{6}$/.test(r.month)) return { ok: false, error: 'Housing month is invalid.' };
  if (typeof r.asset !== 'string' || r.asset.length > 20) return { ok: false, error: 'Asset type is invalid.' };
  if (r.trades !== null && r.trades !== undefined) {
    if (!isPlainObject(r.trades)) return { ok: false, error: 'Trades are invalid.' };
    const t = r.trades as Record<string, unknown>;
    if (!Array.isArray(t.items) || (t.items as unknown[]).length > 20) return { ok: false, error: 'Stored trades exceed the limit (20).' };
    for (const it of t.items as unknown[]) {
      if (!isPlainObject(it)) return { ok: false, error: 'A trade is invalid.' };
      const q = it as Record<string, unknown>;
      if (typeof q.price_10k !== 'number' || !Number.isFinite(q.price_10k) || (q.price_10k as number) < 10) return { ok: false, error: 'A trade price is invalid.' };
      if (typeof q.deal_date !== 'string' || !isValidDateString(q.deal_date)) return { ok: false, error: 'A trade date is invalid.' };
    }
  }
  if (typeof r.tradesStatus !== 'string' || (r.tradesStatus as string).length > 500) return { ok: false, error: 'Trades status is invalid.' };
  if (!Array.isArray(r.factors) || (r.factors as unknown[]).length > 12) return { ok: false, error: 'Factors exceed the limit.' };
  for (const f of r.factors as unknown[]) {
    if (!isPlainObject(f)) return { ok: false, error: 'A factor is invalid.' };
    const e = checkFactorRow(f as Record<string, unknown>);
    if (e) return { ok: false, error: e };
  }
  if (!Array.isArray(r.scenarios) || (r.scenarios as unknown[]).length > 20) return { ok: false, error: 'Scenarios exceed the limit.' };
  for (const sc of r.scenarios as unknown[]) {
    if (!isPlainObject(sc)) return { ok: false, error: 'A scenario is invalid.' };
    const sr = sc as Record<string, unknown>;
    if (typeof sr.homeId !== 'string' || !sr.homeId.trim()) return { ok: false, error: 'Scenario home is invalid.' };
    if (!isPlainObject(sr.input)) return { ok: false, error: 'Scenario is invalid.' };
    const e = checkScenarioInput(sr.input as Record<string, unknown>);
    if (e) return { ok: false, error: e };
  }
  if (r.scenarioDrafts !== undefined && r.scenarioDrafts !== null) {
    if (!isPlainObject(r.scenarioDrafts)) return { ok: false, error: 'Scenario drafts are invalid.' };
    const ks = Object.keys(r.scenarioDrafts);
    if (ks.length > 2) return { ok: false, error: 'Scenario drafts exceed two homes.' };
    for (const k of ks) { if (!isPlainObject((r.scenarioDrafts as Record<string, unknown>)[k])) return { ok: false, error: 'Scenario is invalid.' }; const e = checkScenarioInput((r.scenarioDrafts as Record<string, unknown>)[k] as Record<string, unknown>); if (e) return { ok: false, error: e }; }
  }
  if (r.homeFactors !== undefined && r.homeFactors !== null) {
    if (!isPlainObject(r.homeFactors)) return { ok: false, error: 'Home factors are invalid.' };
    const ks = Object.keys(r.homeFactors);
    if (ks.length > 2) return { ok: false, error: 'Home factors exceed two homes.' };
    for (const k of ks) {
      const arr = (r.homeFactors as Record<string, unknown>)[k];
      if (!Array.isArray(arr) || (arr as unknown[]).length > 12) return { ok: false, error: 'Home factors exceed the limit.' };
      for (const f of arr as unknown[]) { if (!isPlainObject(f)) return { ok: false, error: 'A home factor is invalid.' }; const e = checkFactorRow(f as Record<string, unknown>); if (e) return { ok: false, error: e }; }
    }
  }
  if (r.factorProfile !== undefined && r.factorProfile !== null && (typeof r.factorProfile !== 'string' || !PROFILE_IDS.includes(r.factorProfile as string))) return { ok: false, error: 'Factor profile is invalid.' };
  return { ok: true };
}
export function validateSessionBody(v: unknown): { ok: boolean; error?: string; session?: ValidSession } {
  try {
    if (!isPlainObject(v)) return { ok: false, error: 'A session object is required.' };
    if (v.version !== undefined && v.version !== 1) return { ok: false, error: 'Unsupported record version.' };
    if (v.mode !== 'demo' && v.mode !== 'live') return { ok: false, error: 'Mode is invalid.' };
    const mode: 'demo' | 'live' = v.mode;
    const cands: unknown = v.candidates;
    if (!Array.isArray(cands) || cands.length > MAX_CANDS) return { ok: false, error: 'At most two homes can be compared.' };
    const seen = new Set<string>();
    const candidates: ValidCandidate[] = [];
    for (const c of cands) {
      if (!isPlainObject(c)) return { ok: false, error: 'Home info is invalid.' };
      const id: unknown = c.id; const nickname: unknown = c.nickname; const address: unknown = c.address; const source: unknown = c.source; const coords: unknown = c.coords ?? null; const confirmed: unknown = c.confirmed;
      if (typeof id !== 'string' || !id.trim() || id.length > ID_MAX) return { ok: false, error: 'Home id is invalid.' };
      if (seen.has(id)) return { ok: false, error: 'Home ids are duplicated.' };
      seen.add(id);
      if (typeof nickname !== 'string' || !nickname.trim() || nickname.length > NICK_MAX) return { ok: false, error: 'Home nickname is invalid.' };
      if (typeof address !== 'string' || !address.trim() || address.length > ADDR_MAX) return { ok: false, error: 'Home address is invalid.' };
      if (typeof source !== 'string' || !ALLOWED_CAND_SOURCES_LOCAL.includes(source)) return { ok: false, error: 'Home source is invalid.' };
      if (coords !== null && !isValidCoords(coords)) return { ok: false, error: 'Coordinates are invalid.' };
      if (typeof confirmed !== 'boolean') return { ok: false, error: 'Address confirmation flag is invalid.' };
      if (mode === 'demo' && source !== 'demo') return { ok: false, error: 'Demo records cannot mix real-address sources.' };
      if (mode === 'live' && source !== 'user-confirmed') return { ok: false, error: 'My-address records cannot mix fictional sources.' };
      candidates.push({ id, nickname, address, source, coords: (coords as ValidCoords | null) ?? null, confirmed });
    }
    const ids = new Set<string>(candidates.map((c) => c.id));
    const activeCandidateId: unknown = v.activeCandidateId;
    if (typeof activeCandidateId !== 'string') return { ok: false, error: 'Selected home is invalid.' };
    if (candidates.length === 0) { if (activeCandidateId !== '') return { ok: false, error: 'Selected home is invalid.' }; }
    else if (!ids.has(activeCandidateId)) return { ok: false, error: 'Selected home is not in the list.' };
    const activeStopId: unknown = v.activeStopId;
    if (typeof activeStopId !== 'string' || !ALLOWED_STOPS.includes(activeStopId)) return { ok: false, error: 'Observation stop is invalid.' };
    const pris: unknown = v.priorities;
    if (!Array.isArray(pris) || pris.length > MAX_PRI) return { ok: false, error: 'At most three priorities.' };
    const pset = new Set<string>(); const canonPri: string[] = [];
    for (const p of pris) {
      const m = canonPriority(p);
      if (!m) return { ok: false, error: 'A priority is invalid.' };
      if (pset.has(m)) return { ok: false, error: 'Priorities are duplicated.' };
      pset.add(m); canonPri.push(m);
    }
    const initialQuestions: unknown = v.initialQuestions;
    if (typeof initialQuestions !== 'string' || initialQuestions.length > TEXT_MAX) return { ok: false, error: 'Initial questions exceed the limit.' };
    const obsRaw: unknown = v.observations;
    if (!Array.isArray(obsRaw) || obsRaw.length > MAX_OBS) return { ok: false, error: 'Observation records exceed the limit.' };
    const seenOb = new Set<string>();
    const observations: ValidObservation[] = [];
    for (const o of obsRaw) {
      if (!isPlainObject(o)) return { ok: false, error: 'An observation is invalid.' };
      const oid: unknown = o.id; const ocid: unknown = o.candidateId; const stopId: unknown = o.stopId; const text: unknown = o.text; const question: unknown = o.question; const sourceType: unknown = o.sourceType; const sourceUrl: unknown = o.sourceUrl; const sourceDate: unknown = o.sourceDate ?? null; const resolved: unknown = o.resolved; const updatedAt: unknown = o.updatedAt;
      if (typeof oid !== 'string' || !oid.trim() || oid.length > ID_MAX) return { ok: false, error: 'Observation id is invalid.' };
      if (seenOb.has(oid)) return { ok: false, error: 'Observation ids are duplicated.' };
      seenOb.add(oid);
      if (typeof ocid !== 'string' || !ids.has(ocid)) return { ok: false, error: 'An observation points to an unknown home.' };
      if (typeof stopId !== 'string' || !ALLOWED_STOPS.includes(stopId)) return { ok: false, error: 'Observation stop is invalid.' };
      if (typeof text !== 'string' || !text.trim() || text.length > TEXT_MAX) return { ok: false, error: 'Observation text is invalid.' };
      if (typeof question !== 'string' || question.length > TEXT_MAX) return { ok: false, error: 'Observation question exceeds the limit.' };
      if (typeof sourceType !== 'string' || !ALLOWED_OBS_SOURCES.includes(sourceType)) return { ok: false, error: 'Observation source is invalid.' };
      if (typeof sourceUrl !== 'string' || !isValidHttpUrl(sourceUrl)) return { ok: false, error: 'Source URL must start with http(s).' };
      if (!isValidDateString(sourceDate)) return { ok: false, error: 'Source date is invalid.' };
      if (typeof resolved !== 'boolean') return { ok: false, error: 'Resolved flag is invalid.' };
      if (typeof updatedAt !== 'string' || !isValidTimestamp(updatedAt)) return { ok: false, error: 'Observation time is invalid.' };
      if (mode === 'demo' && sourceType === 'provider') return { ok: false, error: 'Demo records cannot mix provider sources.' };
      if (mode === 'live' && sourceType === 'hypothetical') return { ok: false, error: 'My-address records cannot mix fictional notes.' };
      observations.push({ id: oid, candidateId: ocid, stopId, text, question, sourceType, sourceUrl, sourceDate: (sourceDate as string | null) ?? null, resolved, updatedAt });
    }
    let visitNotes: string | undefined;
    if (v.visitNotes !== undefined) {
      if (typeof v.visitNotes !== 'string' || v.visitNotes.length > NOTES_MAX) return { ok: false, error: 'Visit notes exceed the limit.' };
      visitNotes = v.visitNotes;
    }
    let visitMemos: ValidMemo[] | undefined;
    if (v.visitMemos !== undefined) {
      if (!Array.isArray(v.visitMemos) || v.visitMemos.length > MAX_MEMOS) return { ok: false, error: 'Visit memos exceed the limit.' };
      const mids = new Set<string>(); const memos: ValidMemo[] = [];
      for (const m of v.visitMemos) {
        if (!isPlainObject(m)) return { ok: false, error: 'A visit memo is invalid.' };
        const mid: unknown = m.id; const mcid: unknown = m.candidateId; const mtext: unknown = m.text; const mdate: unknown = m.date ?? null; const mup: unknown = m.updatedAt;
        if (typeof mid !== 'string' || !mid.trim() || mid.length > ID_MAX) return { ok: false, error: 'Visit memo id is invalid.' };
        if (mids.has(mid)) return { ok: false, error: 'Visit memo ids are duplicated.' };
        mids.add(mid);
        if (typeof mcid !== 'string' || !ids.has(mcid)) return { ok: false, error: 'A memo points to an unknown home.' };
        if (typeof mtext !== 'string' || !mtext.trim() || mtext.length > TEXT_MAX) return { ok: false, error: 'Visit memo text is invalid.' };
        if (!isValidDateString(mdate)) return { ok: false, error: 'Visit memo date is invalid.' };
        if (typeof mup !== 'string' || !isValidTimestamp(mup)) return { ok: false, error: 'Visit memo time is invalid.' };
        memos.push({ id: mid, candidateId: mcid, text: mtext, date: (mdate as string | null) ?? null, updatedAt: mup });
      }
      visitMemos = memos;
    }
    let changeLog: ValidLog[] | undefined;
    if (v.changeLog !== undefined) {
      if (!Array.isArray(v.changeLog) || v.changeLog.length > MAX_LOG) return { ok: false, error: 'Change history exceeds the limit.' };
      const logs: ValidLog[] = [];
      for (const e of v.changeLog) {
        if (!isPlainObject(e)) return { ok: false, error: 'Change history is invalid.' };
        const at: unknown = e.at; const note: unknown = e.note;
        if (typeof at !== 'string' || !at || !isValidTimestamp(at)) return { ok: false, error: 'Change history time is invalid.' };
        if (typeof note !== 'string' || !note.trim() || note.length > TEXT_MAX) return { ok: false, error: 'Change history text is invalid.' };
        logs.push({ at, note });
      }
      changeLog = logs;
    }
    if (v.complete !== undefined && typeof v.complete !== 'boolean') return { ok: false, error: 'Completion flag is invalid.' };
    if (v.updatedAt !== undefined && (typeof v.updatedAt !== 'string' || !isValidTimestamp(v.updatedAt))) return { ok: false, error: 'Update time is invalid.' };
    if (v.stage !== undefined && (typeof v.stage !== 'string' || !ALLOWED_STAGES.includes(v.stage))) return { ok: false, error: 'Saved step is invalid.' };
    const simCheck = validateSim((v as Record<string, unknown>).simulation);
    if (!simCheck.ok) return { ok: false, error: simCheck.error };
    const hCheck = validateHousingServer((v as Record<string, unknown>).housing);
    if (!hCheck.ok) return { ok: false, error: hCheck.error };
    let bytes = 0;
    try { bytes = Buffer.byteLength(JSON.stringify(v), 'utf8'); } catch { return { ok: false, error: 'Request size exceeds the limit.' }; }
    if (bytes > MAX_BYTES) return { ok: false, error: 'Request size exceeds the limit.' };
    const session: ValidSession = { mode, candidates, activeCandidateId: activeCandidateId as string, activeStopId: activeStopId as string, priorities: canonPri, initialQuestions: initialQuestions as string, observations };
    if (typeof v.version === 'number') session.version = v.version;
    if (visitNotes !== undefined) session.visitNotes = visitNotes;
    if (visitMemos !== undefined) session.visitMemos = visitMemos;
    if (changeLog !== undefined) session.changeLog = changeLog;
    if (typeof v.complete === 'boolean') session.complete = v.complete;
    if (typeof v.updatedAt === 'string') session.updatedAt = v.updatedAt;
    if (typeof v.stage === 'string') session.stage = v.stage;
    if (simCheck.sim) session.simulation = simCheck.sim;
    if ((v as Record<string, unknown>).housing !== undefined) session.housing = (v as Record<string, unknown>).housing;
    return { ok: true, session };
  } catch { return { ok: false, error: 'Session validation failed.' }; }
}
const BANNED: string[] = ['guaranteed safe', 'no fraud', 'guaranteed return', 'crime rate', 'loan approved', 'legally guaranteed', 'prices will rise', '100% safe'];
export function hasBannedClaim(s: string): boolean { if (typeof s !== 'string') return false; const low = s.toLowerCase(); return BANNED.some((b) => low.includes(b)); }
export function validateModelOutput(v: unknown, knownIds: string[]): { questions: ModelQuestion[] } {
  const out: ModelQuestion[] = [];
  if (!isPlainObject(v)) return { questions: [] };
  const raw: unknown = (v as { questions?: unknown }).questions;
  if (!Array.isArray(raw)) return { questions: [] };
  const known = new Set<string>(Array.isArray(knownIds) ? knownIds.filter((id): id is string => typeof id === 'string') : []);
  const SCAN_MAX = 20;
  const scanned: unknown[] = raw.slice(0, SCAN_MAX);
  for (const q of scanned) {
    if (out.length >= 3) break;
    if (!isPlainObject(q)) continue;
    const rec = q as Record<string, unknown>;
    if (typeof rec.text !== 'string') continue;
    const text: string = rec.text.trim();
    if (text.length < 2 || text.length > 300) continue;
    if (!text.endsWith('?') && !text.endsWith('\uff1f')) continue;
    let reason = '';
    if (rec.reason === undefined || rec.reason === null || rec.reason === '') reason = '';
    else if (typeof rec.reason !== 'string') continue;
    else reason = rec.reason.trim().slice(0, 300);
    if (!Array.isArray(rec.evidenceIds)) continue;
    if (rec.evidenceIds.length > 4) continue;
    let foreign = false;
    const ids: string[] = [];
    for (const id of rec.evidenceIds) { if (typeof id !== 'string' || !known.has(id)) { foreign = true; break; } ids.push(id); }
    if (foreign) continue;
    if (hasBannedClaim(text) || (reason && hasBannedClaim(reason))) continue;
    out.push({ text, reason, evidenceIds: ids });
  }
  return { questions: out.slice(0, 3) };
}
