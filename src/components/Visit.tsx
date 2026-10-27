import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import MapView from "./MapView";
import MusePanel from "./MusePanel";
import ScenarioLab from "./ScenarioLab";
import FactorPanel from "./FactorPanel";
import { DEMO_EVIDENCE, DEMO_NOTE } from "../data/demo";
import { DEFAULT_SIM, scenarioInsight, snapshotText, type SimState } from "../domain/simulation";
import { LIMITS, STOPS, byteSize, emptyHousing, isValidDateString, isValidHttpUrl, openQuestions, sourceTypeLabel, stopLabel, uid, type Session, type StopId } from "../domain/session";
type Tab = "notes" | "scenarios" | "checks";
export default function Visit({ session, onChange, onNext, onBack }: { session: Session; onChange: (s: Session) => void; onNext: () => void; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("notes");
  const [text, setText] = useState(""); const [question, setQuestion] = useState(""); const [url, setUrl] = useState(""); const [date, setDate] = useState("");
  const [formMsg, setFormMsg] = useState(""); const [editingId, setEditingId] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<null | { json: string }>(null);
  const [sim, setSim] = useState<SimState>(session.simulation ?? { ...DEFAULT_SIM });
  const cand = session.candidates.find((c) => c.id === session.activeCandidateId) ?? session.candidates[0];
  const stop = STOPS.find((s) => s.id === session.activeStopId) ?? STOPS[0];
  const ctxKey = cand ? cand.id + "|" + stop.id : "";
  const firstRef = useRef(true);
  const mirror = useRef({ text: "", question: "", url: "", date: "" });
  mirror.current = { text, question, url, date };
  useEffect(() => { if (firstRef.current) { firstRef.current = false; return; } const d = mirror.current; const had = d.text.trim() !== "" || d.question.trim() !== "" || d.url.trim() !== "" || d.date !== ""; setText(""); setQuestion(""); setUrl(""); setDate(""); setEditingId(null); setDeleted(null); setFormMsg(had ? "Moved to another home or stop. The draft fields were cleared." : ""); }, [ctxKey]);
  const obs = useMemo(() => (cand ? session.observations.filter((o) => o.candidateId === cand.id && o.stopId === stop.id) : []), [session.observations, cand, stop.id]);
  const demoItems = session.mode === "demo" && cand ? DEMO_EVIDENCE.filter((d) => d.home === cand.id && d.stop === stop.id) : [];
  const nextQs = cand ? openQuestions(session, cand.id, 3) : [];
  const progress = STOPS.filter((s) => cand && session.observations.some((o) => o.candidateId === cand.id && o.stopId === s.id)).length;
  const insight = cand ? scenarioInsight(cand.id, stop.id, sim) : null;
  const housing = session.housing ?? emptyHousing();
  const heading = session.mode === "demo" ? "A day in Solan Village" : "Visit checks · " + (cand?.nickname ?? "My address");
  if (!cand) return (<section aria-labelledby="visit-h"><h1 id="visit-h" tabIndex={-1}>Visit checks</h1><p>Please set an address on the Prepare screen first.</p><Button label="Back to prepare" variant="secondary" onClick={onBack} /></section>);
  function handleSim(next: SimState) { setSim(next); onChange({ ...session, simulation: next }); }
  function saveScenario() {
    if (session.mode !== "demo") return;
    if (session.observations.length >= LIMITS.observations) { setFormMsg("Observation records reached the maximum."); return; }
    const snap = snapshotText(cand.id, stop.id, sim);
    const q = insight ? insight.question : "";
    const next = { ...session, observations: [...session.observations, { id: uid("ob"), candidateId: cand.id, stopId: stop.id, text: snap, question: q, sourceType: "hypothetical" as const, sourceUrl: "", sourceDate: null, resolved: false, updatedAt: new Date().toISOString() }] };
    if (byteSize(next) > LIMITS.jsonBytes) { setFormMsg("The record is near the size limit and cannot be saved."); return; }
    onChange(next); setFormMsg("Saved this scenario with time, light, and traffic.");
  }
  function addOrSave() {
    const t = text.trim(); const q = question.trim(); const u = url.trim();
    if (!t) { setFormMsg("Please enter what you observed."); return; }
    if (t.length > 2000 || q.length > 2000) { setFormMsg("Notes and questions are limited to 2000 characters each."); return; }
    if (!isValidHttpUrl(u)) { setFormMsg("Source URL must start with http(s) and contain no login info."); return; }
    const d = date ? date : null;
    if (!isValidDateString(d)) { setFormMsg("Please pick the source date from the calendar."); return; }
    if (editingId) {
      const target = session.observations.find((o) => o.id === editingId);
      if (!target || target.candidateId !== cand.id || target.stopId !== stop.id) { setFormMsg("The note being edited belongs to another home or stop. Please edit it there."); setEditingId(null); return; }
      const next = { ...session, observations: session.observations.map((o) => (o.id === editingId ? { ...o, text: t, question: q, sourceUrl: u, sourceDate: d, updatedAt: new Date().toISOString() } : o)) };
      if (byteSize(next) > LIMITS.jsonBytes) { setFormMsg("The record is near the size limit."); return; }
      onChange(next); setEditingId(null); setFormMsg("Saved the edit.");
    } else {
      if (session.observations.length >= LIMITS.observations) { setFormMsg("Observation records reached the maximum."); return; }
      const next = { ...session, observations: [...session.observations, { id: uid("ob"), candidateId: cand.id, stopId: stop.id, text: t, question: q, sourceType: "user" as const, sourceUrl: u, sourceDate: d, resolved: false, updatedAt: new Date().toISOString() }] };
      if (byteSize(next) > LIMITS.jsonBytes) { setFormMsg("The record is near the size limit."); return; }
      onChange(next); setFormMsg("Saved.");
    }
    setText(""); setQuestion(""); setUrl(""); setDate("");
  }
  function remove(id: string) {
    const target = session.observations.find((o) => o.id === id);
    if (!target) return;
    if (!window.confirm("Delete this note?")) return;
    setDeleted({ json: JSON.stringify(target) });
    onChange({ ...session, observations: session.observations.filter((o) => o.id !== id) });
    if (editingId === id) { setEditingId(null); setText(""); setQuestion(""); setUrl(""); setDate(""); }
    setFormMsg("Deleted. Use undo to restore it.");
  }
  function undo() {
    if (!deleted) return;
    try {
      const o = JSON.parse(deleted.json) as Session["observations"][number];
      if (o.candidateId !== cand.id || o.stopId !== stop.id) { setFormMsg("That note belongs to another home or stop, so it was not restored here."); return; }
      onChange({ ...session, observations: [...session.observations, o] }); setDeleted(null); setFormMsg("Restored.");
    } catch { setFormMsg("Restore failed."); }
  }
  const recent = [...session.observations].filter((o) => o.candidateId === cand.id).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 3);
  return (
    <section aria-labelledby="visit-h">
      <h1 id="visit-h" tabIndex={-1} className="stage-title">{heading} {session.mode === "demo" ? <Badge label="Fictional demo" variant="neutral" /> : <Badge label="My address" variant="info" />}</h1>
      {session.mode === "demo" ? <p className="demo-banner">{DEMO_NOTE}</p> : <p className="demo-banner live-note">Only your entered address and your own notes are used. No synthetic scenery is attached to real addresses.</p>}
      {housing.region && <p className="hint" role="status">District plan: {housing.region.name} · {housing.month} · {housing.asset} {housing.trades ? "· " + housing.trades.sample_count + " past sales" : "· no sales loaded"} <Badge label="public data" variant="info" /></p>}
      <div className="switcher"><div className="tabs" role="tablist" aria-label="Choose a home">{session.candidates.map((c) => (<button type="button" key={c.id} role="tab" aria-selected={c.id === cand.id} className="hs-tab" onClick={() => onChange({ ...session, activeCandidateId: c.id })}>{c.nickname}</button>))}</div><p className="hint" role="status">Progress {progress}/{STOPS.length} stops · {cand.nickname} · {cand.address}</p></div>
      <SegmentedControl label="Explore panels" value={tab} onChange={(v: string) => setTab(v as Tab)}><SegmentedControlItem value="notes" label="Field notes" /><SegmentedControlItem value="scenarios" label="Life scenarios" /><SegmentedControlItem value="checks" label="Housing checks" /></SegmentedControl>
      <ol className="stops" aria-label="Observation stops">{STOPS.map((s, i) => (<li key={s.id} className={s.id === stop.id ? "on" : ""}><button type="button" className="hs-stop" onClick={() => onChange({ ...session, activeStopId: s.id })} aria-current={s.id === stop.id ? "step" : undefined}><span className="num">{i + 1}</span> {s.label}<small>{s.topic}</small></button></li>))}</ol>
      <div className="workbench wide">
        <div className="mapbox"><MapView session={session} candidate={cand} stopId={stop.id} sim={sim} onSimChange={handleSim} onSelectHome={(id) => { const found = session.candidates.find((c) => c.id === id); if (found) onChange({ ...session, activeCandidateId: found.id }); }} onSelectStop={(id: StopId) => onChange({ ...session, activeStopId: id })} /></div>
        {tab === "notes" && (<aside className="notebook" aria-label="Field notebook">
          <h2>{cand.nickname} · {stop.label}</h2><p className="hint">{stop.topic}</p>
          {insight && <div className="insight"><h3>Current stop insight</h3><p><strong>{insight.title}.</strong> {insight.body}</p><p className="hint">Next question idea: {insight.question}</p></div>}
          {session.mode === "demo" && <div className="hs-actions"><Button label="Save this scenario" variant="primary" size="sm" onClick={saveScenario} /></div>}
          {demoItems.map((d) => (<article key={d.id} className="ev"><h3>{d.title} <Badge label="Fictional premise" variant="neutral" /></h3><p>{d.body}</p><p className="hint">Date unknown · not verifiable by looking alone</p></article>))}
          {session.mode === "live" && obs.length === 0 && <p className="hint">No verified nearby info yet. Please check {stop.topic.toLowerCase()} yourself. (Needs a visit)</p>}
          <h3>My notes ({obs.length})</h3>
          {obs.map((o) => (<article key={o.id} className="ev"><p>{o.text}</p>{o.question && <p>Question: {o.question} ({o.resolved ? "checked by me (self-reported)" : "open"})</p>}<p className="hint">{sourceTypeLabel(o.sourceType)} · {cand.nickname}·{stopLabel(o.stopId)} · {o.sourceDate ?? "date unknown"}{o.sourceUrl && (<span> · <a href={o.sourceUrl} target="_blank" rel="noreferrer">Open source</a></span>)} · {o.updatedAt ? o.updatedAt.slice(0, 10) : "no time recorded"}</p><div className="hs-row"><button type="button" className="hs-ghost" onClick={() => onChange({ ...session, observations: session.observations.map((x) => (x.id === o.id ? { ...x, resolved: !x.resolved, updatedAt: new Date().toISOString() } : x)) })}>{o.resolved ? "Mark open" : "Mark checked by me"}</button><button type="button" className="hs-ghost" onClick={() => { setEditingId(o.id); setText(o.text.startsWith("Solan Village") ? "" : o.text); setQuestion(o.question); setUrl(o.sourceUrl); setDate(o.sourceDate ?? ""); setFormMsg("Editing. Moving to another home or stop will clear these fields before you save."); }}>Edit</button><button type="button" className="hs-ghost" onClick={() => remove(o.id)}>Delete</button></div></article>))}
          {deleted && <div className="hs-actions"><Button label="Undo delete" variant="secondary" size="sm" onClick={undo} /></div>}
          <h3>{editingId ? "Edit note" : "Write a note"}</h3>
          <label className="hs-label" htmlFor="ob-text">Observation</label><textarea className="hs-native" id="ob-text" value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Write what you see, as seen" />
          <label className="hs-label" htmlFor="ob-q">Remaining question</label><input className="hs-native" id="ob-q" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} placeholder="Remaining question (optional)" />
          <label className="hs-label" htmlFor="ob-url">Source URL</label><input className="hs-native" id="ob-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Source URL (optional, https://…)" inputMode="url" maxLength={500} />
          <label className="hs-label" htmlFor="ob-date">Source date (optional)</label><input className="hs-native" id="ob-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="hs-actions"><Button label={editingId ? "Save edit" : "Add note"} variant="primary" size="sm" onClick={addOrSave} /></div>
          {formMsg && <p role="status" className="hint">{formMsg}</p>}
          <h3>Top 3 questions to check ({cand.nickname})</h3><ul>{nextQs.map((o) => (<li key={o.id}>{o.question}</li>))}{nextQs.length === 0 && <li>No open questions. Add a note and it will appear here.</li>}</ul>
          {recent.length > 0 && <div><h3>Recent changes</h3><ul>{recent.map((o) => (<li key={o.id} className="hint">{o.updatedAt ? o.updatedAt.slice(0, 10) : "unrecorded"} · {o.text.slice(0, 30)}</li>))}</ul></div>}
          <MusePanel session={session} />
        </aside>)}
        {tab === "scenarios" && (<div className="widepanel" aria-label="Life scenarios panel"><ScenarioLab key={cand.id} session={session} homeId={cand.id} onChange={onChange} /></div>)}
        {tab === "checks" && (<div className="widepanel" aria-label="Housing checks panel"><FactorPanel session={session} onChange={onChange} homeId={cand.id} /><MusePanel session={session} /></div>)}
      </div>
      <div className="hs-actions visit-nav sticky"><Button label="Back to prepare" variant="secondary" onClick={onBack} /><Button label="Go to compare" variant="primary" onClick={onNext} /></div>
    </section>
  );
}