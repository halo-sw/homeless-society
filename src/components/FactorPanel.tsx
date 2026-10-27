import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { Slider } from "@astryxdesign/core/Slider";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { FACTOR_META, PROFILES } from "../domain/housing";
import { deriveProfile, emptyHousing, homeFactorsFor, type FactorState, type HousingState, type Session } from "../domain/session";
const LINKS: Record<string, string> = { schools: "https://www.schoolinfo.go.kr", development: "https://map.seoul.go.kr/smgis2/short/6OIN3", building: "https://www.data.go.kr/data/15134735/openapi.do", cost: "https://rt.molit.go.kr/pt/xls/xls.do" };
export default function FactorPanel({ session, onChange, homeId }: { session: Session; onChange: (s: Session) => void; homeId?: string }) {
  const housing: HousingState = session.housing ?? emptyHousing();
  const derived = deriveProfile(housing.factors);
  const profile = housing.factorProfile && (PROFILES[housing.factorProfile] || housing.factorProfile === "custom") ? housing.factorProfile : derived;
  const [open, setOpen] = useState<string | null>(null);
  function applyProfile(p: string) {
    const w = PROFILES[p]?.weights ?? {};
    const factors: FactorState[] = FACTOR_META.map((m) => { const prev = housing.factors.find((f) => f.id === m.id); return { id: m.id, weight: (w[m.id] ?? 1) as number, note: prev?.note ?? "", evidence: prev?.evidence ?? "missing", sourceUrl: prev?.sourceUrl ?? "", sourceDate: prev?.sourceDate ?? null }; });
    const hf = { ...(housing.homeFactors ?? {}) };
    for (const k of Object.keys(hf)) { hf[k] = hf[k].map((f) => ({ ...f, weight: (w[f.id] ?? 1) as number })); }
    onChange({ ...session, housing: { ...housing, factors, homeFactors: hf, factorProfile: p } });
  }
  function patchGlobal(id: string, p: Partial<FactorState>) {
    const factors = housing.factors.map((f) => (f.id === id ? { ...f, ...p } : f));
    onChange({ ...session, housing: { ...housing, factors, factorProfile: deriveProfile(factors) } });
  }
  function patchHome(id: string, p: Partial<FactorState>) {
    if (!homeId) { patchGlobal(id, p); return; }
    const cur = homeFactorsFor(housing, homeId);
    const next = cur.map((f) => (f.id === id ? { ...f, ...p } : f));
    const hf = { ...(housing.homeFactors ?? {}), [homeId]: next };
    onChange({ ...session, housing: { ...housing, homeFactors: hf } });
  }
  const rows = homeId ? homeFactorsFor(housing, homeId) : housing.factors;
  const withEvidence = rows.filter((f) => f.evidence === "linked-source" || f.evidence === "user-observed").length;
  const top = [...housing.factors].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const isSeoul = (housing.region?.name ?? "").includes("서울");
  return (
    <section aria-label="Housing factors" className="hs-card">
      <h2>What to check <Badge label={withEvidence + "/12 with evidence"} variant="info" /></h2>
      {!homeId && (<><SegmentedControl label="Choose a profile" value={profile === "custom" ? "custom" : profile} onChange={applyProfile}><SegmentedControlItem value="commuter" label="Commuter" /><SegmentedControlItem value="family" label="Family" /><SegmentedControlItem value="firsthome" label="First home" /><SegmentedControlItem value="custom" label="Custom" /></SegmentedControl>
      <p className="hint">Profile: {profile === "custom" ? "Custom" : profile} · Top: {top.map((t) => t.id + "(" + t.weight + ")").join(", ")}. Missing is different from negative.</p></>)}
      {homeId && <p className="hint">Per-home evidence for this home only. Weights come from Prepare.</p>}
      {FACTOR_META.map((m) => {
        const f = rows.find((x) => x.id === m.id);
        if (!f) return null;
        const isOpen = open === m.id;
        const status = f.evidence === "linked-source" ? "linked" : f.evidence === "user-observed" ? "self-reported" : f.evidence;
        return (
          <div key={m.id} className="hs-factor">
            <div className="hs-factor-row"><Button label={(isOpen ? "Hide " : "Check ") + m.label + " (" + f.weight + "/3 · " + status + ")"} variant="secondary" size="sm" onClick={() => setOpen(isOpen ? null : m.id)} /></div>
            {isOpen && (<div><p className="hint">{m.hint}</p>
              {!homeId && <Slider label={m.label + " priority (0–3)"} value={f.weight} min={0} max={3} step={1} onChange={(v: number) => patchGlobal(m.id, { weight: Math.round(v) })} />}
              {homeId && <p className="hint">Priority weight: {housing.factors.find((x) => x.id === m.id)?.weight ?? 1}/3 (set in Prepare)</p>}
              <label className="hs-label" htmlFor={(homeId ?? "g") + "-fn-" + m.id}>Notes</label>
              <textarea className="hs-native" id={(homeId ?? "g") + "-fn-" + m.id} value={f.note} onChange={(e) => (homeId ? patchHome(m.id, { note: e.target.value.slice(0, 2000) }) : patchGlobal(m.id, { note: e.target.value.slice(0, 2000) }))} rows={2} maxLength={2000} placeholder="What did you verify yourself?" />
              <label className="hs-label" htmlFor={(homeId ?? "g") + "-fe-" + m.id}>Evidence status</label>
              <select className="hs-native" id={(homeId ?? "g") + "-fe-" + m.id} value={f.evidence} onChange={(e) => (homeId ? patchHome(m.id, { evidence: e.target.value as FactorState["evidence"] }) : patchGlobal(m.id, { evidence: e.target.value as FactorState["evidence"] }))}>
                <option value="missing">missing</option><option value="unverified">unverified</option><option value="user-observed">user-observed</option><option value="linked-source">linked-source</option>
              </select>
              <p className="hint">Status shows linked/self-reported, never verified. Unverified is not counted as evidence.</p>
              <label className="hs-label" htmlFor={(homeId ?? "g") + "-fu-" + m.id}>Source URL (optional)</label>
              <input className="hs-native" id={(homeId ?? "g") + "-fu-" + m.id} value={f.sourceUrl} onChange={(e) => (homeId ? patchHome(m.id, { sourceUrl: e.target.value.slice(0, 500) }) : patchGlobal(m.id, { sourceUrl: e.target.value.slice(0, 500) }))} inputMode="url" maxLength={500} placeholder="https://…" />
              <label className="hs-label" htmlFor={(homeId ?? "g") + "-fd-" + m.id}>Source date</label>
              <input className="hs-native" id={(homeId ?? "g") + "-fd-" + m.id} type="date" value={f.sourceDate ?? ""} onChange={(e) => (homeId ? patchHome(m.id, { sourceDate: e.target.value || null }) : patchGlobal(m.id, { sourceDate: e.target.value || null }))} />
              {f.sourceUrl && <p className="hint"><a href={f.sourceUrl} target="_blank" rel="noreferrer">Open source</a> · {f.sourceDate ?? "no date"}</p>}
              {LINKS[m.id] && m.id !== "development" && <p className="hint"><a href={LINKS[m.id]} target="_blank" rel="noreferrer">Open official source</a> · entering a URL alone is not verification.</p>}
              {m.id === "schools" && <p className="hint"><a href="https://www.schoolinfo.go.kr" target="_blank" rel="noreferrer">National school info</a> · no ratings invented; verify catchment with the school.</p>}
              {m.id === "development" && (isSeoul ? <p className="hint"><a href="https://map.seoul.go.kr/smgis2/short/6OIN3" target="_blank" rel="noreferrer">Seoul catchment map (official)</a></p> : <p className="hint">Seoul catchment map is Seoul-only; use your local office for other regions.</p>)}
              {!LINKS[m.id] && <p className="hint">Manual source needed for this category.</p>}
            </div>)}
          </div>
        );
      })}
    </section>
  );
}