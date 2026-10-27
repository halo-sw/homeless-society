import { useEffect, useState } from "react";
import Prep from "./components/Prep";
import Visit from "./components/Visit";
import Summary from "./components/Summary";
import { canEnterStage, emptySession, hasConfirmedCandidate, restoreSession, saveSession, clearSaved, type Session, type StageId } from "./domain/session";
import { isPublicDemo } from "./lib/api";
const KEY = "hs-session-v1";
const STAGES: { id: StageId; label: string }[] = [{ id: "prep", label: "Prepare" }, { id: "visit", label: "Explore" }, { id: "summary", label: "Compare" }];
function loadInitial(): { session: Session; stage: StageId; notice: string; saved: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { session: emptySession(), stage: "prep", notice: "", saved: false };
    const s = restoreSession(KEY);
    if (!s) return { session: emptySession(), stage: "prep", notice: "The saved record was damaged, so we started fresh. Import a valid record if needed.", saved: false };
    let st: StageId = s.stage ?? (s.candidates.length ? "visit" : "prep");
    if (!canEnterStage(st, s)) st = "prep";
    return { session: s, stage: st, notice: "", saved: true };
  } catch { return { session: emptySession(), stage: "prep", notice: "Could not read storage, so we started fresh.", saved: false }; }
}
export default function App() {
  const [boot] = useState(loadInitial);
  const [session, setSession] = useState<Session>(boot.session);
  const [stage, setStage] = useState<StageId>(boot.stage);
  const [saveState, setSaveState] = useState(boot.saved ? "Saved locally" : "No saved notes");
  const [notice, setNotice] = useState(boot.notice);
  useEffect(() => { const h = document.querySelector("main h1") as HTMLElement | null; if (h) { try { h.focus({ preventScroll: false }); } catch { h.focus(); } } }, [stage]);
  useEffect(() => { if (!hasConfirmedCandidate(session) && stage !== "prep") setStage("prep"); }, [session, stage]);
  function persist(next: Session, st: StageId, label: string) {
    setSession(next);
    setStage(st);
    try { saveSession(KEY, next, st); setSaveState(label); }
    catch { setSaveState("Save failed"); }
  }
  function update(next: Session) { persist(next, stage, "Saved locally"); }
  function go(st: StageId) { if (!canEnterStage(st, session)) return; setStage(st); try { saveSession(KEY, session, st); } catch { setSaveState("Save failed"); } }
  function startSession(next: Session) {
    if (!canEnterStage("visit", next)) return;
    setSession(next);
    setStage("visit");
    try { saveSession(KEY, next, "visit"); setSaveState("Saved locally"); }
    catch { setSaveState("Save failed"); }
  }
  function handleImport(imported: Session) {
    const raw = (imported as unknown as { stage?: unknown }).stage;
    const valid = raw === "prep" || raw === "visit" || raw === "summary" ? (raw as StageId) : null;
    let st: StageId | null = valid && canEnterStage(valid, imported) ? valid : null;
    if (!st) {
      if (canEnterStage("summary", imported)) st = "summary";
      else if (canEnterStage("visit", imported)) st = "visit";
      else if (hasConfirmedCandidate(imported)) st = "visit";
      else st = "prep";
      if (!canEnterStage(st, imported)) st = "prep";
    }
    const { stage: _drop, ...rest } = imported as Session & { stage?: unknown };
    void _drop;
    const clean = rest as Session;
    setSession(clean);
    setStage(st);
    try { saveSession(KEY, clean, st); setSaveState("Saved locally"); }
    catch { setSaveState("Save failed"); }
    setNotice("Imported the record.");
  }
  function clearAll() {
    if (!window.confirm("Delete all saved notes on this device? This cannot be undone.")) return;
    try { clearSaved(KEY); setSession(emptySession()); setStage("prep"); setSaveState("No saved notes"); setNotice(""); }
    catch { setNotice("Could not clear storage. Please check browser storage settings."); }
  }
  const modeBadge = session.candidates.length === 0 ? "Getting ready" : session.mode === "demo" ? "Fictional demo session" : "My address session";
  return (
    <div className="hs-app page">
      <header className="masthead">
        <div className="brand"><span aria-hidden="true">⌂</span> Homeless Society <span className="mode-badge">{modeBadge}</span></div>
        <nav aria-label="Steps"><ol className="stages">{STAGES.map((s, i) => { const ok = canEnterStage(s.id, session); return (<li key={s.id} aria-current={stage === s.id ? "step" : undefined} className={stage === s.id ? "on" : ""}><button type="button" className="hs-stage" onClick={() => go(s.id)} disabled={!ok} title={!ok ? "Please confirm a home on the Prepare screen first" : undefined}>{i + 1}. {s.label}</button></li>); })}</ol></nav>
        <div className="save" role="status">{saveState}</div>
      </header>
      {notice && <p className="notice" role="alert">{notice}</p>}
      <main tabIndex={-1} className="main">
        {stage === "prep" && <Prep session={session} onChange={update} onStart={startSession} onImport={handleImport} />}
        {stage === "visit" && <Visit session={session} onChange={update} onNext={() => go("summary")} onBack={() => go("prep")} />}
        {stage === "summary" && <Summary session={session} stage={stage} onChange={update} onBack={() => go("visit")} onImport={handleImport} />}
      </main>
      <footer className="foot">
        <button type="button" className="ghost hs-ghost" onClick={clearAll}>Clear my notes</button>
        {isPublicDemo() ? (<><span>Public demo: notes stored on device; district lookup shares district/month/asset with k-skill; field prompts are local with no AI request; external map links open the provider.</span><details><summary>Technical details</summary><p className="hint">Field guide only. No /api/muse request is sent in public demo. Marking complete is separate from resolving every question and guarantees nothing about safety.</p></details></>) : (<><span>Notes stay on this device. Pressing Ask Muse sends the selected home with its notes to Meta. Address search and maps share addresses and coordinates with Kakao.</span><details><summary>Technical details</summary><p className="hint">Before an AI connection only local guidance appears. Marking complete is separate from resolving every question and guarantees nothing about safety. Transfers are limited to the selected home with its observations and memos. Housing data query shares district/month/asset for public data.</p></details></>)}
      </footer>
    </div>
  );
}
