import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { Slider } from "@astryxdesign/core/Slider";
import { commuteHoursPerMonth, monthlyPaymentM, priceCurve, savedHoursPerMonth } from "../domain/housing";
import { draftFor, emptyHousing, uid, type HousingState, type ScenarioInput, type Session } from "../domain/session";
export function describeScenario(input: ScenarioInput): { loanM: number; monthly: number; hours: number } {
  const loanM = Math.max(input.priceM - input.cashM, 0);
  const pi = monthlyPaymentM(loanM, input.annualRate, input.termYears);
  return { loanM, monthly: pi + input.monthlyFees, hours: commuteHoursPerMonth(input.commuteMin, input.workdays) };
}
function NumField({ id, label, value, min, max, step, onCommit, placeholder }: { id: string; label: string; value: number | null; min: number; max: number; step?: string; onCommit: (v: number | null) => void; placeholder?: string }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value === null || value === undefined ? "" : String(value));
  function commitRaw(raw: string): void {
    const t = raw.trim();
    if (t === "") { onCommit(null); return; }
    const n = Number(t);
    if (!Number.isFinite(n) || n < min || n > max || n < 0) return;
    onCommit(n);
  }
  return (<div className="hs-field"><label className="hs-label" htmlFor={id}>{label}</label><input className="hs-native" id={id} type="number" value={shown} min={min} max={max} step={step} placeholder={placeholder} inputMode="decimal" onChange={(e) => { setText(e.target.value); commitRaw(e.target.value); }} onBlur={(e) => { commitRaw(e.target.value); setText(null); }} /></div>);
}
export default function ScenarioLab({ session, homeId, onChange }: { session: Session; homeId: string; onChange: (s: Session) => void }) {
  const housing: HousingState = session.housing ?? emptyHousing();
  const input: ScenarioInput = draftFor(housing, homeId);
  function setDraft(next: ScenarioInput) {
    const drafts = { ...(housing.scenarioDrafts ?? {}), [homeId]: next };
    onChange({ ...session, housing: { ...housing, scenarioDrafts: drafts } });
  }
  function patch(p: Partial<ScenarioInput>) {
    const base = { ...input, ...p };
    const clean: ScenarioInput = {
      ...base,
      priceM: Number.isFinite(base.priceM) && base.priceM >= 0 && base.priceM <= 100000 ? base.priceM : input.priceM,
      cashM: Number.isFinite(base.cashM) && base.cashM >= 0 && base.cashM <= 100000 ? base.cashM : input.cashM,
      annualRate: Number.isFinite(base.annualRate) && base.annualRate >= 0 && base.annualRate <= 30 ? base.annualRate : input.annualRate,
      termYears: Number.isInteger(base.termYears) && base.termYears >= 1 && base.termYears <= 50 ? base.termYears : input.termYears,
      monthlyFees: Number.isFinite(base.monthlyFees) && base.monthlyFees >= 0 && base.monthlyFees <= 1000 ? base.monthlyFees : input.monthlyFees,
      commuteMin: Number.isFinite(base.commuteMin) && base.commuteMin >= 0 && base.commuteMin <= 300 ? base.commuteMin : input.commuteMin,
      workdays: Number.isInteger(base.workdays) && base.workdays >= 0 && base.workdays <= 31 ? base.workdays : input.workdays,
      yearsAhead: Number.isInteger(base.yearsAhead) && base.yearsAhead >= 1 && base.yearsAhead <= 10 ? base.yearsAhead : input.yearsAhead,
      childAge: base.childAge === null || base.childAge === undefined ? null : (Number.isInteger(base.childAge) && base.childAge >= 0 && base.childAge <= 30 ? base.childAge : input.childAge),
      improveMin: Number.isFinite(base.improveMin) && base.improveMin >= 0 ? Math.min(base.improveMin, base.commuteMin) : input.improveMin,
      openingYear: base.openingYear === null || base.openingYear === undefined ? null : (Number.isInteger(base.openingYear) && base.openingYear >= 2020 && base.openingYear <= 2060 ? base.openingYear : input.openingYear),
      growthPct: Number.isFinite(base.growthPct) && base.growthPct >= -5 && base.growthPct <= 5 ? base.growthPct : input.growthPct,
      newSupply: base.newSupply,
      transitTheme: base.transitTheme
    };
    setDraft(clean);
  }
  const r = describeScenario(input);
  const curYear = new Date().getFullYear();
  const active = input.openingYear !== null && input.openingYear !== undefined ? curYear + input.yearsAhead >= (input.openingYear as number) : false;
  const saved = savedHoursPerMonth(Math.min(input.improveMin, input.commuteMin), input.workdays, active);
  const afterHours = Math.max(r.hours - saved, 0);
  const curve = priceCurve(input.priceM, input.growthPct, input.yearsAhead);
  const childAt = input.childAge === null || input.childAge === undefined ? null : (input.childAge as number) + input.yearsAhead;
  const plus2 = monthlyPaymentM(Math.max(input.priceM - input.cashM, 0), input.annualRate + 2, input.termYears) + input.monthlyFees;
  const maxC = Math.max(...curve, 1);
  const pts = curve.map((v, i) => ({ x: 40 + (i / Math.max(input.yearsAhead, 1)) * 440, y: 150 - (v / maxC) * 120 }));
  function save() {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) { const el = document.activeElement; if (el.tagName === "INPUT") el.blur(); }
    const fresh = draftFor(session.housing ?? housing, homeId);
    const label = "Scenario " + new Date().toISOString().slice(0, 10) + " · " + fresh.priceM + "M";
    const row = { id: uid("sc"), homeId, input: { ...fresh }, createdAt: new Date().toISOString(), label };
    const base = session.housing ?? housing;
    const scenarios = [...base.scenarios, row].slice(-20);
    const drafts = { ...(base.scenarioDrafts ?? {}), [homeId]: { ...fresh } };
    onChange({ ...session, housing: { ...base, scenarios, scenarioDrafts: drafts } });
  }
  const savedList = housing.scenarios.filter((s) => s.homeId === homeId);
  return (
    <section aria-label="Scenario lab" className="hs-card">
      <h3>Life scenario <Badge label="hypothetical" variant="neutral" /></h3>
      <p className="hint">Illustrative only for this home. Growth is your assumption, not a forecast. Transit saving applies only after the opening year.</p>
      <div role="status" className="hs-results hs-top">
        <p><strong>Monthly housing cost:</strong> {r.monthly.toLocaleString("en-US", { maximumFractionDigits: 2 })}M per month · <strong>Commute:</strong> {r.hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}h per month</p>
      </div>
      <div className="hs-two">
        <div><h4>Finance</h4>
          <NumField id="sc-price" label="Home price (KRW million)" value={input.priceM} min={0} max={100000} onCommit={(v) => { if (v !== null) patch({ priceM: v }); }} />
          <NumField id="sc-cash" label="Cash available (KRW million)" value={input.cashM} min={0} max={100000} onCommit={(v) => { if (v !== null) patch({ cashM: v }); }} />
          <NumField id="sc-rate" label="Annual rate (%)" value={input.annualRate} min={0} max={30} step="0.1" onCommit={(v) => { if (v !== null) patch({ annualRate: v }); }} />
          <NumField id="sc-term" label="Loan term (years)" value={input.termYears} min={1} max={50} onCommit={(v) => { if (v !== null) patch({ termYears: Math.round(v) }); }} />
          <NumField id="sc-fees" label="Monthly housing fees (KRW million, your assumption)" value={input.monthlyFees} min={0} max={1000} step="0.01" onCommit={(v) => { if (v !== null) patch({ monthlyFees: v }); }} />
        </div>
        <div><h4>Daily life</h4>
          <NumField id="sc-commute" label="One-way commute (minutes)" value={input.commuteMin} min={0} max={300} onCommit={(v) => { if (v !== null) patch({ commuteMin: v }); }} />
          <NumField id="sc-workdays" label="Workdays per month" value={input.workdays} min={0} max={31} onCommit={(v) => { if (v !== null) patch({ workdays: Math.round(v) }); }} />
          <NumField id="sc-child" label="Child age now (optional)" value={input.childAge} min={0} max={30} placeholder="optional" onCommit={(v) => patch({ childAge: v === null ? null : Math.round(v) })} />
          <NumField id="sc-improve" label="Assumed commute improvement (minutes, one-way)" value={input.improveMin} min={0} max={120} onCommit={(v) => { if (v !== null) patch({ improveMin: v }); }} />
          <NumField id="sc-open" label="Assumed transit opening year" value={input.openingYear} min={2020} max={2060} placeholder="e.g. 2029" onCommit={(v) => patch({ openingYear: v === null ? null : Math.round(v) })} />
        </div>
      </div>
      <Slider label={"Years ahead (1–10): " + input.yearsAhead} value={input.yearsAhead} min={1} max={10} step={1} onChange={(v: number) => patch({ yearsAhead: Math.round(v) })} />
      <Slider label={"Hypothetical growth (%/yr): " + input.growthPct} value={input.growthPct} min={-5} max={5} step={0.5} onChange={(v: number) => patch({ growthPct: v })} />
      <label className="hs-check"><input type="checkbox" checked={input.newSupply} onChange={(e) => patch({ newSupply: e.target.checked })} /> Large new supply nearby (assumption only, does not change the model)</label>
      <label className="hs-check"><input type="checkbox" checked={input.transitTheme} onChange={(e) => patch({ transitTheme: e.target.checked })} /> Transit theme (assumption only, does not change the model)</label>
      <div role="status" className="hs-results">
        <p><strong>Monthly housing cost:</strong> baseline {r.monthly.toLocaleString("en-US", { maximumFractionDigits: 2 })}M vs +2pp {plus2.toLocaleString("en-US", { maximumFractionDigits: 2 })}M per month</p>
        <div aria-hidden="true" className="hs-bars"><div className="hs-bar" style={{ width: Math.max(8, (r.monthly / Math.max(plus2, 0.01)) * 160) + "px" }} /><div className="hs-bar stress" style={{ width: "160px" }} /></div>
        <p>Loan amount: {r.loanM.toLocaleString("en-US")}M KRW · Commute before {r.hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}h vs after {afterHours.toLocaleString("en-US", { maximumFractionDigits: 1 })}h per month · Saved {saved.toLocaleString("en-US", { maximumFractionDigits: 1 })}h {active ? "(active after opening)" : "(none before opening)"}</p>
        <p>Child age in {input.yearsAhead} years: {childAt === null ? "not given (no enrollment prediction)" : childAt + " years old"}</p>
        {input.newSupply && <p className="hint">New supply can ease scarcity but can add resale competition. Mechanism only; no coefficient.</p>}
        {input.transitTheme && <p className="hint">Transit access can shorten trips but construction brings noise first. Mechanism only.</p>}
      </div>
      <h4>Assumed price curve (not a forecast)</h4>
      <svg viewBox="0 0 520 180" role="img" aria-label={"Assumed price curve for " + input.yearsAhead + " years at " + input.growthPct + " percent"} className="hs-curve">
        <line x1="40" y1="10" x2="40" y2="150" stroke="#999" strokeWidth="1" />
        <line x1="40" y1="150" x2="500" y2="150" stroke="#999" strokeWidth="1" />
        <text x="6" y="30" fontSize="10">M</text>
        <text x="470" y="168" fontSize="10">years</text>
        <polyline points={pts.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ")} fill="none" stroke="#1f3d2b" strokeWidth="3" />
        {pts.map((p, i) => (<g key={i}><circle cx={p.x} cy={p.y} r={i === input.yearsAhead ? 6 : 3.5} fill={i === input.yearsAhead ? "#c25e3a" : "#1f4fd8"} /><text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10">{Math.round(curve[i])}M</text><text x={p.x} y={164} textAnchor="middle" fontSize="9">+{i}y</text></g>))}
      </svg>
      <p className="hint">Values: {curve.map((v) => Math.round(v)).join(" → ")}M over {input.yearsAhead} years at your {input.growthPct}% assumption. Selected year follows the Years ahead slider.</p>
      <details><summary>Formulas</summary><p className="hint">Monthly payment uses equal principal and interest: r = annual/12, n = years*12. Commute hours = one-way*2*workdays/60. Saving = improvement*2*workdays/60 only after opening year, capped at total commute. Price curve = price*(1+g)^t.</p></details>
      <div className="hs-actions"><Button label="Save scenario snapshot" variant="primary" size="sm" onClick={save} /></div>
      {savedList.length > 0 && (<ul>{savedList.map((s) => <li key={s.id} className="hint">{s.label} · {s.createdAt.slice(0, 10)}</li>)}</ul>)}
    </section>
  );
}