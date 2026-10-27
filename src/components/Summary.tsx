import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { LIMITS, STOPS, emptyHousing, homeFactorsFor, isValidDateString, missingStopsFor, openQuestions, sourceTypeLabel, stopLabel, summarize, uid, type Session, type StageId } from "../domain/session";
import { FACTOR_META, commuteHoursPerMonth, monthlyPaymentM, savedHoursPerMonth } from "../domain/housing";
import { describeScenario } from "./ScenarioLab";
import SessionImport from "./SessionImport";
export default function Summary({ session, stage, onChange, onBack, onImport }: { session: Session; stage: StageId; onChange: (s: Session) => void; onBack: () => void; onImport: (s: Session) => void }) {
  const [msg, setMsg] = useState("");
  const [memoText, setMemoText] = useState<Record<string, string>>({});
  const [memoDate, setMemoDate] = useState<Record<string, string>>({});
  const [openHomes, setOpenHomes] = useState<Record<string, boolean>>({});
  const sum = summarize(session);
  const memos = session.visitMemos ?? [];
  const allOpen = openQuestions(session, undefined, 20);
  const scenCount = session.observations.filter((o) => o.sourceType === "hypothetical").length;
  const housing = session.housing ?? emptyHousing();
  function latestFor(homeId: string) { const list = housing.scenarios.filter((s) => s.homeId === homeId); return list.length ? list[list.length - 1] : null; }
  function download() {
    try {
      const payload = { ...session, stage };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "homeless-society-session.json"; document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg("Saved the record JSON.");
    } catch { setMsg("Save failed."); }
  }
  function downloadChecklist() {
    try {
      const lines: string[] = ["Visit checklist", ""];
      lines.push("District: " + (housing.region ? housing.region.name + " " + housing.region.lawd_cd + " " + housing.month + " " + housing.asset : "no district") + " · source " + (housing.trades?.source ?? "none"));
      for (const c of session.candidates) {
        lines.push(""); lines.push("[" + c.nickname + "] " + c.address);
        const missing = missingStopsFor(session, c.id);
        for (const m of missing) lines.push("- Unvisited: " + m.label + " (" + m.topic + ")");
        const mine = allOpen.filter((o) => o.candidateId === c.id);
        for (const o of mine) lines.push("- Question: " + o.question + " (" + stopLabel(o.stopId) + ")");
        const hf = homeFactorsFor(housing, c.id);
        const miss = hf.filter((f) => f.evidence === "missing" || f.evidence === "unverified").map((f) => f.id);
        if (miss.length) lines.push("- Missing checks: " + miss.join(", "));
        const sc = latestFor(c.id);
        if (sc) lines.push("- Hypothetical scenario: price " + sc.input.priceM + "M growth " + sc.input.growthPct + "% horizon " + sc.input.yearsAhead + "y rate " + sc.input.annualRate + "%");
        else lines.push("- No saved scenario: unavailable");
      }
      for (const t of sum.askVisit) lines.push("- " + t);
      lines.push("", "Priorities: " + (session.priorities.join(", ") || "not chosen"));
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "visit-checklist.txt"; document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg("Saved the visit checklist.");
    } catch { setMsg("Save failed."); }
  }
  function saveMemo(candidateId: string) {
    const existing = memos.find((m) => m.candidateId === candidateId);
    const rawText = memoText[candidateId] !== undefined ? memoText[candidateId] : (existing?.text ?? "");
    const t = rawText.trim();
    const d = memoDate[candidateId] ?? existing?.date ?? "";
    if (!t) { setMsg("Please enter a visit memo."); return; }
    if (t.length > 2000) { setMsg("Visit memos are limited to 2000 characters."); return; }
    if (d && !isValidDateString(d)) { setMsg("Please pick the visit date from the calendar."); return; }
    const list = [...memos]; const ix = list.findIndex((m) => m.candidateId === candidateId);
    const row = { id: ix >= 0 ? list[ix].id : uid("memo"), candidateId, text: t, date: d || null, updatedAt: new Date().toISOString() };
    if (ix >= 0) list[ix] = row; else list.push(row);
    onChange({ ...session, visitMemos: list.slice(-LIMITS.memos) });
    setMemoText((p) => { const n = { ...p }; delete n[candidateId]; return n; });
    setMemoDate((p) => { const n = { ...p }; delete n[candidateId]; return n; });
    setMsg("Saved the visit memo.");
  }
  function deleteMemo(candidateId: string) {
    const existing = memos.find((m) => m.candidateId === candidateId);
    if (!existing) return;
    if (!window.confirm("Delete this visit memo?")) return;
    onChange({ ...session, visitMemos: memos.filter((m) => m.candidateId !== candidateId) });
    setMemoText((p) => { const n = { ...p }; delete n[candidateId]; return n; });
    setMemoDate((p) => { const n = { ...p }; delete n[candidateId]; return n; });
    setMsg("Deleted the visit memo.");
  }
  void STOPS;
  return (
    <section aria-labelledby="sum-h">
      <h1 id="sum-h" tabIndex={-1} className="stage-title">Compare side by side {session.mode === "demo" ? <Badge label="Fictional demo" variant="neutral" /> : <Badge label="My address" variant="info" />}</h1>
      <p className="lede" role="status">{session.observations.length} notes · {scenCount} fictional scenarios · {allOpen.length} open questions {housing.region ? "· district " + housing.region.name + " " + housing.month : "· no district selected"}</p>
      <div className={session.candidates.length <= 1 ? "compare single" : "compare"}>
        {session.candidates.map((c) => {
          const list = session.observations.filter((o) => o.candidateId === c.id);
          const memo = memos.find((m) => m.candidateId === c.id);
          const missing = missingStopsFor(session, c.id);
          const sc = latestFor(c.id);
          let out = null as null | { monthly: number; plus2: number; hours: number; saved: number; price: number };
          if (sc) { const d = describeScenario(sc.input); const curY = new Date().getFullYear(); const act = sc.input.openingYear !== null && sc.input.openingYear !== undefined ? curY + sc.input.yearsAhead >= sc.input.openingYear : false; const sv = savedHoursPerMonth(Math.min(sc.input.improveMin, sc.input.commuteMin), sc.input.workdays, act); out = { monthly: d.monthly, plus2: monthlyPaymentM(Math.max(sc.input.priceM - sc.input.cashM, 0), sc.input.annualRate + 2, sc.input.termYears) + sc.input.monthlyFees, hours: d.hours, saved: sv, price: Math.round(sc.input.priceM * Math.pow(1 + sc.input.growthPct / 100, sc.input.yearsAhead)) }; }
          void commuteHoursPerMonth;
          return (
            <article key={c.id} aria-label={c.nickname + " comparison"}>
              <h2>{c.nickname}</h2>
              <p className="hint">{c.address} · {c.source === "demo" ? "fictional demo" : "verified by user"} · {c.coords ? (c.coords.verified ? "address search result" : "manual entry (unverified)") : "no coordinates"}</p>
              {missing.length > 0 && <p className="hint">Unvisited ({c.nickname}): {missing.map((m) => m.label).join(", ")}</p>}
              {list.length === 0 && <p className="hint">No notes yet. Unchecked does not mean fine.</p>}
              <ul>{list.map((o) => (<li key={o.id}>{o.text} ({o.resolved ? "checked by me (self-reported)" : "open"}){o.question && o.question.trim() ? " Question: " + o.question.trim() + " (" + (o.resolved ? "checked by me (self-reported)" : "open") + ")" : ""} <span className="hint">· {c.nickname}·{stopLabel(o.stopId)}·{sourceTypeLabel(o.sourceType)} · {o.sourceDate ?? "date unknown"}{o.sourceUrl && (<span> · <a href={o.sourceUrl} target="_blank" rel="noreferrer">Source</a></span>)}</span></li>))}</ul>
              {sc && out ? (<div className="hs-results" role="status"><p><strong>Latest saved hypothetical:</strong> {sc.label} · {sc.createdAt.slice(0, 10)}</p><p>Monthly {out.monthly.toLocaleString("en-US", { maximumFractionDigits: 2 })}M vs +2pp {out.plus2.toLocaleString("en-US", { maximumFractionDigits: 2 })}M · commute {out.hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}h · saved {out.saved.toLocaleString("en-US", { maximumFractionDigits: 1 })}h · assumed price {out.price}M in {sc.input.yearsAhead}y</p><p className="hint">Assumptions: price {sc.input.priceM}M rate {sc.input.annualRate}% growth {sc.input.growthPct}% horizon {sc.input.yearsAhead}y · hypothetical, not a forecast.</p></div>) : (<p className="hint">No saved scenario: unavailable.</p>)}
              {memo && <p className="hint">Visit memo ({memo.date ?? "no date"}): {memo.text}</p>}
              <div className="hs-actions"><Button label={(openHomes[c.id] ? "Hide" : "Show") + " factor notes for " + c.nickname} variant="secondary" size="sm" onClick={() => setOpenHomes({ ...openHomes, [c.id]: !openHomes[c.id] })} /></div>
              {openHomes[c.id] && (<ul>{homeFactorsFor(housing, c.id).map((f) => (<li key={f.id} className="hint">{f.id}: {f.evidence === "linked-source" ? "linked" : f.evidence === "user-observed" ? "self-reported" : f.evidence}{f.note ? " · " + f.note.slice(0, 80) : ""}{f.sourceUrl ? (<span> · <a href={f.sourceUrl} target="_blank" rel="noreferrer">Open source</a></span>) : null} · {f.sourceDate ?? "no date"}</li>))}</ul>)}
            </article>
          );
        })}
        {session.candidates.length === 0 && <p>No confirmed homes yet.</p>}
      </div>
      <h2>Factor coverage A/B</h2>
      <table className="hs-coverage" aria-label="Factor coverage"><thead><tr><th scope="col">Factor</th>{session.candidates.map((c) => <th key={c.id} scope="col">{c.nickname}</th>)}</tr></thead><tbody>{FACTOR_META.map((m) => (<tr key={m.id}><th scope="row">{m.label}</th>{session.candidates.map((c) => { const f = homeFactorsFor(housing, c.id).find((x) => x.id === m.id); const e = f?.evidence ?? "missing"; return <td key={c.id}>{e === "linked-source" ? "linked" : e === "user-observed" ? "self-reported" : e}</td>; })}</tr>))}</tbody></table>
      {housing.trades ? <p className="hint">Past sales sample: {housing.trades.sample_count} records · {housing.trades.deal_ymd} · {housing.trades.median_price_10k === null ? "median unavailable" : "median " + (housing.trades.median_price_10k / 100) + "M KRW"} · bounded subset, not a forecast. <span>Source: <a href="https://rt.molit.go.kr/pt/xls/xls.do" target="_blank" rel="noreferrer">official MOLIT</a> via <a href="https://github.com/NomaDamas/k-skill" target="_blank" rel="noreferrer">k-skill</a> (<a href="https://k-skill-proxy.nomadamas.org" target="_blank" rel="noreferrer">proxy</a>){housing.trades.fetchedAt ? " · fetched " + housing.trades.fetchedAt : ""} · {housing.region ? housing.region.name + " " + housing.region.lawd_cd : "no district"} · {housing.month} · {housing.asset} · {housing.trades.source} · fictional homes and notes are separate.</span> <Badge label="public data" variant="info" /></p> : <p className="hint">No sales loaded: unavailable.</p>}
      <div className="cols3"><div><h2>Observed</h2><ul>{session.observations.map((o) => { const cn = session.candidates.find((c) => c.id === o.candidateId)?.nickname ?? "home"; return (<li key={o.id}>{o.text} <span className="hint">({cn}·{stopLabel(o.stopId)}·{sourceTypeLabel(o.sourceType)}{o.resolved ? "·checked by me (self-reported)" : "·open"})</span></li>); })}{session.observations.length === 0 && <li>No observation notes yet.</li>}</ul></div><div><h2>Still unknown</h2><ul>{sum.open.map((t, i) => (<li key={i}>{t}</li>))}{session.candidates.flatMap((c) => missingStopsFor(session, c.id).map((s) => ({ c, s }))).map(({ c, s }) => (<li key={c.id + s.id}>{c.nickname} {s.label} unvisited: {s.topic}</li>))}<li>Night hours and interiors are unverified.</li></ul></div><div><h2>Visit checklist</h2><ol>{sum.askVisit.map((t, i) => (<li key={i}>{t}</li>))}<li>Re-check with your priorities ({session.priorities.join(", ") || "not chosen"}) and open questions.</li></ol></div></div>
      <h2>First interests and questions</h2><p className="hint">Priorities: {session.priorities.join(", ") || "none"} · shared first questions: {session.initialQuestions || "none"}</p>
      {allOpen.length > 0 && <ul>{allOpen.slice(0, 5).map((o) => { const cn = session.candidates.find((c) => c.id === o.candidateId)?.nickname ?? "home"; return (<li key={o.id} className="hint">{cn}·{stopLabel(o.stopId)}: {o.question}</li>); })}</ul>}
      <h2>Visit memos per home (with date, saved explicitly)</h2>
      {session.candidates.map((c) => (<div key={c.id} className="memo"><h3>{c.nickname}</h3><label className="hs-label" htmlFor={"memo-" + c.id}>Visit memo</label><textarea className="hs-native" id={"memo-" + c.id} rows={2} maxLength={2000} value={memoText[c.id] ?? memos.find((m) => m.candidateId === c.id)?.text ?? ""} onChange={(e) => setMemoText({ ...memoText, [c.id]: e.target.value })} placeholder="Write what you saw after visiting" /><label className="hs-label" htmlFor={"date-" + c.id}>Visit date</label><input className="hs-native" id={"date-" + c.id} type="date" value={memoDate[c.id] ?? memos.find((m) => m.candidateId === c.id)?.date ?? ""} onChange={(e) => setMemoDate({ ...memoDate, [c.id]: e.target.value })} /><div className="hs-actions"><Button label="Save memo" variant="primary" size="sm" onClick={() => saveMemo(c.id)} />{memos.some((m) => m.candidateId === c.id) && <Button label="Delete memo" variant="secondary" size="sm" onClick={() => deleteMemo(c.id)} />}</div></div>))}
      <label className="hs-check"><input type="checkbox" checked={session.complete} onChange={(e) => onChange({ ...session, complete: e.target.checked })} /> Mark session complete (separate from resolving every question; it guarantees nothing about safety)</label>
      <div className="hs-actions"><Button label="Back to explore" variant="secondary" onClick={onBack} /><Button label="Print visit sheet" variant="secondary" size="sm" onClick={() => window.print()} /><Button label="Save record JSON" variant="secondary" size="sm" onClick={download} /><Button label="Save visit checklist" variant="secondary" size="sm" onClick={downloadChecklist} /><SessionImport session={session} onImport={onImport} onMessage={setMsg} /></div>
      {msg && <p role="status">{msg}</p>}
    </section>
  );
}