import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { containsBannedClaim, stopLabel, type Session } from "../domain/session";
import { fetchMuseStatus, isPublicDemo, localFieldGuide, requestMuseQuestions } from "../lib/api";
interface Q { text: string; reason: string; evidenceIds: string[] }
interface StatusState { aiReady: boolean; note: string; extra?: string; model?: string }
export default function MusePanel({ session }: { session: Session }) {
  const pub = isPublicDemo();
  const [status, setStatus] = useState<StatusState>({ aiReady: false, note: pub ? "Field guide only · no live AI call" : "Checking…" });
  const [qs, setQs] = useState<Q[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [modelName, setModelName] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);
  const mountedRef = useRef(true);
  const sig: string = useMemo(() => JSON.stringify({ a: session.activeCandidateId, s: session.activeStopId, o: session.observations.map((o) => ({ id: o.id, c: o.candidateId, s: o.stopId, t: o.text, q: o.question, r: o.resolved, u: o.updatedAt })), p: session.priorities, q: session.initialQuestions, m: (session.visitMemos ?? []).map((m) => ({ id: m.id, c: m.candidateId, t: m.text, d: m.date, u: m.updatedAt })), n: session.visitNotes }), [session]);
  const sigRef = useRef<string>(sig);
  useEffect(() => {
    if (sigRef.current !== sig) {
      sigRef.current = sig;
      reqIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setQs([]);
      setMsg("The context changed, so the previous suggestions were cleared. Request again if needed.");
      setBusy(false);
    }
  }, [sig]);
  useEffect(() => {
    if (pub) { setStatus({ aiReady: false, note: "Field guide only · no live AI call" }); return; }
    let live = true;
    fetchMuseStatus().then((j) => { if (live) setStatus({ aiReady: !!j.aiReady, note: String(j.note || "Before AI connection"), extra: "calls " + (j.calls ?? 0) }); }).catch(() => { if (live) setStatus({ aiReady: false, note: "Before AI connection" }); });
    return () => { live = false; };
  }, [pub]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; abortRef.current?.abort(); abortRef.current = null; }; }, []);
  async function refreshStatus(): Promise<void> {
    if (pub) return;
    try { const j = await fetchMuseStatus(); if (!mountedRef.current) return; setStatus({ aiReady: !!j.aiReady, note: String(j.note || "Before AI connection"), extra: "calls " + (j.calls ?? 0) }); } catch { }
  }
  function cancel(): void {
    reqIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMsg("Request cancelled. Your notes are unchanged.");
  }
  function showGuide(): void {
    const g = localFieldGuide(session);
    setQs(g.questions);
    setModelName("local-template");
    setMsg("Field guide · prepared with Muse · pre-written prompts. No live AI call.");
  }
  async function ask(): Promise<void> {
    if (pub) { showGuide(); return; }
    const active = session.candidates.find((c) => c.id === session.activeCandidateId) ?? session.candidates[0];
    if (!active) { setMsg("Please confirm a home on the Prepare screen first."); return; }
    const atStart: string = sig;
    const myId: number = reqIdRef.current + 1;
    reqIdRef.current = myId;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer: number = window.setTimeout(() => ctrl.abort(), 120000);
    setBusy(true);
    setMsg("Requesting follow-up questions…");
    try {
      const out = await requestMuseQuestions(session, ctrl.signal);
      window.clearTimeout(timer);
      if (!mountedRef.current) return;
      if (reqIdRef.current !== myId || sigRef.current !== atStart) return;
      const list: Q[] = Array.isArray(out.questions) ? (out.questions as Q[]).filter((q: Q) => q && typeof q.text === "string" && !containsBannedClaim(q.text) && !containsBannedClaim(q.reason || "")) : [];
      const verifiedModel: string = typeof out.model === "string" ? out.model : "";
      if (!mountedRef.current || reqIdRef.current !== myId || sigRef.current !== atStart) return;
      setModelName(verifiedModel);
      if (list.length === 0) {
        setQs([]);
        setMsg(verifiedModel ? "No usable questions arrived (" + verifiedModel + "). Your notes are unchanged. Please retry." : "No usable questions arrived. Your notes are unchanged. Please retry.");
        await refreshStatus();
      } else {
        setQs(list.slice(0, 5));
        setMsg(out.mock ? "Default follow-up questions · before AI connection (local guide)" : "Muse(" + (verifiedModel || "muse-spark-1.3") + ") follow-up questions");
        await refreshStatus();
        if (!mountedRef.current || reqIdRef.current !== myId || sigRef.current !== atStart) return;
        if (!out.mock && verifiedModel) setStatus((prev) => ({ ...prev, aiReady: true, note: "Muse reply verified", model: verifiedModel }));
      }
    } catch (e) {
      window.clearTimeout(timer);
      if (!mountedRef.current) return;
      if (reqIdRef.current !== myId) return;
      const raw = e instanceof Error ? e.message : "";
      if (ctrl.signal.aborted) setMsg("The Muse request failed: cancelled or timed out. Your notes are unchanged.");
      else if (/request failed/i.test(raw)) setMsg("The Muse request failed (" + raw.slice(0, 160) + "). Your notes are unchanged. Please retry.");
      else setMsg("The Muse request failed (network error). Your notes are unchanged. Please retry.");
    }
    if (mountedRef.current && reqIdRef.current === myId) setBusy(false);
  }
  function evidenceLabel(id: string): string {
    const o = session.observations.find((x) => x.id === id);
    if (!o) return "unknown evidence";
    const cn: string = session.candidates.find((c) => c.id === o.candidateId)?.nickname ?? "home";
    return cn + "·" + stopLabel(o.stopId) + ": " + o.text.slice(0, 40);
  }
  if (pub) {
    return (
      <section aria-label="Field guide prepared with Muse" className="muse">
        <h4>Field guide · prepared with Muse</h4>
        <p className="hint">Pre-written prompts. No live AI call. Scoped to the current home and stop; free for the full flow.</p>
        <div className="actions"><Button label="Show field prompts" variant="primary" size="sm" onClick={showGuide} /></div>
        {msg && <p role="status">{msg}</p>}
        <ul>{qs.map((q, i) => (<li key={i}>{q.text} <span className="meta">({q.reason})</span></li>))}</ul>
      </section>
    );
  }
  return (
    <section aria-label="Muse follow-up questions" className="muse">
      <h4>Muse follow-up questions</h4>
      {!status.aiReady && <p className="hint">Before AI connection: {status.note}. You can continue with the local guide.</p>}
      {status.aiReady && <p className="hint">Status: {status.note} · {status.extra ?? ""}{modelName ? " · model: " + modelName : ""}</p>}
      <div className="actions">
        <Button label={busy ? "Requesting…" : "Ask Muse for follow-up questions"} variant="primary" size="sm" onClick={ask} />
        {busy && <Button label="Cancel" variant="secondary" size="sm" onClick={cancel} />}
      </div>
      {msg && <p role="status">{msg}</p>}
      <ul>{qs.map((q, i) => (<li key={i}>{q.text} <span className="meta">({q.reason || "follow-up"}) [evidence: {(q.evidenceIds || []).map((id) => evidenceLabel(id)).join(" / ") || "none"}]</span></li>))}</ul>
      <details><summary>Connection details</summary><p className="hint">Model: muse-spark-1.3 · status: {status.note} · {status.extra ?? ""} · 120s limit · scope: selected home with its observations and visit memos only. Global notes are never sent.</p></details>
    </section>
  );
}
