import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import NeighborhoodScene from "./NeighborhoodScene";
import DistrictSearch from "./DistrictSearch";
import FactorPanel from "./FactorPanel";
import { LIMITS, PRIORITY_OPTIONS, emptyHousing, hasWork, startDemoSession, startLiveSession, togglePriorityWithLimit, type Session, type StopId } from "../domain/session";
import { DEFAULT_SIM, type SimState } from "../domain/simulation";
import { isPublicDemo } from "../lib/api";
import SessionImport from "./SessionImport";
interface GeoHit { address: string; lat: number; lng: number }
export default function Prep({ session, onChange, onStart, onImport }: { session: Session; onChange: (s: Session) => void; onStart: (s: Session) => void; onImport: (s: Session) => void }) {
  const pub = isPublicDemo();
  const isLive = session.mode === "live";
  const c0 = isLive ? session.candidates[0] : undefined;
  const c1 = isLive ? session.candidates[1] : undefined;
  const [nick1, setNick1] = useState(c0?.nickname ?? "Top pick");
  const [addr1, setAddr1] = useState(c0?.address ?? "");
  const [nick2, setNick2] = useState(c1?.nickname ?? "Second pick");
  const [addr2, setAddr2] = useState(c1?.address ?? "");
  const [showSecond, setShowSecond] = useState(!!c1);
  const [conf1, setConf1] = useState(!!c0?.confirmed);
  const [conf2, setConf2] = useState(!!c1?.confirmed);
  const [hits1, setHits1] = useState<GeoHit[]>([]);
  const [hits2, setHits2] = useState<GeoHit[]>([]);
  const [busy1, setBusy1] = useState(false);
  const [busy2, setBusy2] = useState(false);
  const [msg1, setMsg1] = useState("");
  const [msg2, setMsg2] = useState("");
  const [lat1, setLat1] = useState(() => (c0?.coords && !c0.coords.verified ? String(c0.coords.lat) : ""));
  const [lng1, setLng1] = useState(() => (c0?.coords && !c0.coords.verified ? String(c0.coords.lng) : ""));
  const [lat2, setLat2] = useState(() => (c1?.coords && !c1.coords.verified ? String(c1.coords.lat) : ""));
  const [lng2, setLng2] = useState(() => (c1?.coords && !c1.coords.verified ? String(c1.coords.lng) : ""));
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState("");
  const [limitMsg, setLimitMsg] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [previewSim, setPreviewSim] = useState<SimState>(session.simulation ?? { ...DEFAULT_SIM });
  const [previewHome, setPreviewHome] = useState("demo-a");
  const [previewStop, setPreviewStop] = useState<StopId>("around");
  const housing = session.housing ?? emptyHousing();
  function toggle(p: string) { const r = togglePriorityWithLimit(session.priorities, p); onChange({ ...session, priorities: r.next }); setLimitMsg(r.limited ? "You can pick up to 3 priorities." : ""); }
  async function geocode(which: 1 | 2) {
    const q = (which === 1 ? addr1 : addr2).trim();
    const setBusy = which === 1 ? setBusy1 : setBusy2;
    const setMsg = which === 1 ? setMsg1 : setMsg2;
    const setHits = which === 1 ? setHits1 : setHits2;
    if (!q) { setMsg("Please enter an address first."); return; }
    if (pub) { setMsg("Public demo: automatic search is off. Open the official map link, verify the address yourself, then tick the checkbox."); setHits([]); return; }
    setBusy(true); setMsg("Checking the address…");
    try {
      const r = await fetch("/api/geocode", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
      const j = await r.json().catch(() => ({} as { error?: string; results?: GeoHit[] }));
      if (r.status === 501) { setMsg("No address-search key is configured. Verify on the official map link, then tick the checkbox."); setHits([]); }
      else if (!r.ok) setMsg("Search failed: " + (((j as { error?: string }).error) || "please retry."));
      else { const list: GeoHit[] = Array.isArray((j as { results?: unknown }).results) ? ((j as { results: GeoHit[] }).results).slice(0, 5) : []; setHits(list); setMsg(list.length ? "Pick the one real address below." : "No results. Check the spelling or verify on the official map."); }
    } catch { setMsg("Network error. Please verify on the official map link."); }
    finally { setBusy(false); }
  }
  function parseManual(latS: string, lngS: string): { ok: boolean; lat?: number; lng?: number; error?: string } {
    if (!latS.trim() && !lngS.trim()) return { ok: true };
    if (!latS.trim() || !lngS.trim()) return { ok: false, error: "Enter latitude and longitude together." };
    const la = Number(latS); const ln = Number(lngS);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return { ok: false, error: "Latitude and longitude must be numbers." };
    if (la < -90 || la > 90 || ln < -180 || ln > 180) return { ok: false, error: "Use latitude -90 to 90 and longitude -180 to 180." };
    return { ok: true, lat: la, lng: ln };
  }
  function previewAddrs(): { id: string; addr: string }[] {
    const out = [{ id: "live-a", addr: addr1.trim() }];
    if (showSecond && addr2.trim()) out.push({ id: "live-b", addr: addr2.trim() });
    return out;
  }
  function isNonEmptyFactorList(list: { note: string; evidence: string; sourceUrl: string }[]): boolean {
    return (list ?? []).some((f) => f.note.trim() !== "" || f.evidence !== "missing" || f.sourceUrl.trim() !== "");
  }
  function compareCandidateAddressMapping(): Map<string, { oldAddr: string | null; newAddr: string | null }> {
    const m = new Map<string, { oldAddr: string | null; newAddr: string | null }>();
    const next = new Map(previewAddrs().map((p) => [p.id, p.addr.trim()]));
    for (const c of session.candidates) {
      m.set(c.id, { oldAddr: c.address.trim(), newAddr: next.has(c.id) ? (next.get(c.id) as string) : null });
    }
    for (const p of previewAddrs()) {
      if (!m.has(p.id)) m.set(p.id, { oldAddr: null, newAddr: p.addr.trim() });
    }
    return m;
  }
  function liveStartWouldDrop(): boolean {
    if (!hasWork(session)) return false;
    if (session.mode !== "live") {
      if (session.observations.length > 0 || session.visitNotes.trim() !== "" || (session.visitMemos ?? []).length > 0) return true;
      if ((session.housing?.scenarios ?? []).length > 0) return true;
      if (Object.keys(session.housing?.scenarioDrafts ?? {}).length > 0) return true;
      const hf = session.housing?.homeFactors ?? {};
      for (const k of Object.keys(hf)) { if ((hf[k] ?? []).some((f) => f.note.trim() !== "" || f.evidence !== "missing" || f.sourceUrl.trim() !== "")) return true; }
      return false;
    }
    const m = new Map(previewAddrs().map((p) => [p.id, p.addr]));
    for (const o of session.observations) { const na = m.get(o.candidateId); if (na === undefined) return true; const oldAddr = session.candidates.find((c) => c.id === o.candidateId)?.address.trim(); if (oldAddr !== na) return true; }
    for (const mm of session.visitMemos ?? []) { const na = m.get(mm.candidateId); if (na === undefined) return true; const oldAddr = session.candidates.find((c) => c.id === mm.candidateId)?.address.trim(); if (oldAddr !== na) return true; }
    if (session.visitNotes.trim() && session.observations.length === 0) return true;
    const mapping = compareCandidateAddressMapping();
    function addrChanged(id: string): boolean {
      const e = mapping.get(id);
      if (!e) return true;
      if (e.newAddr === null) return true;
      if (e.oldAddr === null) return false;
      return e.oldAddr !== e.newAddr;
    }
    if ((session.housing?.scenarios ?? []).some((s) => addrChanged(s.homeId))) return true;
    if (Object.entries(session.housing?.scenarioDrafts ?? {}).some(([k, v]) => {
      if (!addrChanged(k)) return false;
      if (!v || typeof v !== "object") return true;
      return Object.values(v).some((x) => x !== "" && x !== 0 && x !== null && x !== undefined && !(Array.isArray(x) && x.length === 0));
    })) return true;
    if (Object.entries(session.housing?.homeFactors ?? {}).some(([k, list]) => addrChanged(k) && isNonEmptyFactorList(list as { note: string; evidence: string; sourceUrl: string }[]))) return true;
    return false;
  }
  function demoRestartWouldDrop(): boolean {
    if (!hasWork(session)) return false;
    if (session.mode !== "demo") {
      if (session.observations.length > 0 || session.visitNotes.trim() !== "" || (session.visitMemos ?? []).length > 0) return true;
      if ((session.housing?.scenarios ?? []).length > 0) return true;
      if (Object.keys(session.housing?.scenarioDrafts ?? {}).length > 0) return true;
      const hf = session.housing?.homeFactors ?? {};
      for (const k of Object.keys(hf)) { if ((hf[k] ?? []).some((f) => f.note.trim() !== "" || f.evidence !== "missing" || f.sourceUrl.trim() !== "")) return true; }
      return false;
    }
    if (session.observations.length > 0 || (session.visitMemos ?? []).length > 0 || session.visitNotes.trim() !== "") return true;
    const keep = new Set(["demo-a", "demo-b"]);
    if ((session.housing?.scenarios ?? []).some((s) => !keep.has(s.homeId))) return true;
    if (Object.keys(session.housing?.scenarioDrafts ?? {}).some((k) => !keep.has(k))) return true;
    if (Object.keys(session.housing?.homeFactors ?? {}).some((k) => !keep.has(k))) return true;
    return false;
  }
  const showAck = liveStartWouldDrop() || demoRestartWouldDrop();
  function doDemo() {
    setErr("");
    if (demoRestartWouldDrop() && !ack) { setErr("Starting the fictional demo again will clear existing notes. Tick the confirmation box, then press again."); return; }
    onStart(startDemoSession(session));
  }
  function doLive() {
    setErr("");
    const a1 = addr1.trim();
    if (!a1) { setErr("Please enter the top-pick address."); return; }
    if (!conf1) { setErr("Please verify the top-pick address yourself and tick the checkbox."); return; }
    const m1 = parseManual(lat1, lng1); if (!m1.ok) { setErr("Top-pick coordinates: " + m1.error); return; }
    let second: { nick: string; addr: string } | null = null;
    if (showSecond && addr2.trim()) {
      if (!conf2) { setErr("Please also verify the second address and tick its checkbox."); return; }
      const m2 = parseManual(lat2, lng2); if (!m2.ok) { setErr("Second coordinates: " + m2.error); return; }
      second = { nick: nick2.trim() || "Second pick", addr: addr2.trim() };
    }
    if (liveStartWouldDrop() && !ack) { setErr("Starting with the entered addresses will clear some existing notes. Tick the confirmation box, then press again."); return; }
    const coords1 = m1.lat !== undefined && m1.lng !== undefined ? { lat: m1.lat, lng: m1.lng, verified: false } : null;
    const cands = [{ id: "live-a", nickname: nick1.trim() || "Top pick", address: a1, source: "user-confirmed" as const, coords: coords1, confirmed: true }];
    if (second) { const m2 = parseManual(lat2, lng2); const coords2 = m2.lat !== undefined && m2.lng !== undefined ? { lat: m2.lat, lng: m2.lng, verified: false } : null; cands.push({ id: "live-b", nickname: second.nick, address: second.addr, source: "user-confirmed" as const, coords: coords2, confirmed: true }); }
    onStart(startLiveSession(session, cands));
  }
  const kakaoLink1 = addr1.trim() ? "https://map.kakao.com/link/search/" + encodeURIComponent(addr1.trim()) : "https://map.kakao.com";
  const kakaoLink2 = addr2.trim() ? "https://map.kakao.com/link/search/" + encodeURIComponent(addr2.trim()) : "https://map.kakao.com";
  return (
    <section aria-labelledby="prep-h" className="hs-app">
      <ol className="hs-steps" aria-label="Steps"><li><span className="hs-n">1</span> Pick priorities</li><li><span className="hs-n">2</span> Choose district</li><li><span className="hs-n">3</span> Enter simulation</li></ol>
      <div className="prep-grid">
        <div>
          <p><Badge label="Fictional scenario" variant="neutral" /> <Badge label={housing.region ? housing.region.name : "no district yet"} variant="info" /></p>
          <h1 id="prep-h" tabIndex={-1} className="stage-title">Try a day before you move.</h1>
          <p className="lede">Walk two fictional homes, weigh what matters, and compare with calm notes.</p>
          <div className="hs-actions"><Button label="Enter simulation" variant="primary" onClick={doDemo} /></div>
          <p className="hint">One click starts the fictional Solan Village demo. No account, no keys, no fees.</p>
          {showAck && <label className="hs-check"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I understand that starting again clears some existing notes</label>}
          {err && <p role="alert" className="error">{err}</p>}
          <h2>What matters most? (max 3, {session.priorities.length}/3)</h2>
          <div className="chips" role="group" aria-label="Choose priorities">{PRIORITY_OPTIONS.map((p) => (<button type="button" key={p} aria-pressed={session.priorities.includes(p)} onClick={() => toggle(p)}>{p}</button>))}</div>
          {limitMsg && <p role="status" className="hint">{limitMsg}</p>}
          <h2><label className="hs-label" htmlFor="iq">First questions (optional)</label></h2>
          <textarea className="hs-native" id="iq" value={session.initialQuestions} onChange={(e) => onChange({ ...session, initialQuestions: e.target.value.slice(0, LIMITS.textLen) })} rows={2} maxLength={2000} placeholder="e.g. Is the alley bright at night?" />
          <DistrictSearch session={session} onChange={onChange} />
          <details className="hs-fold"><summary>Factor weights (optional, {housing.factors.filter((f) => f.weight !== 1).length} changed)</summary><FactorPanel session={session} onChange={onChange} /></details>
          <details className="realbox"><summary>Use my real addresses (optional, manual check)</summary>
            {session.mode === "demo" && session.candidates.length > 0 && <p className="demo-banner">Fictional demo session. The fields below are empty, and fictional addresses are never saved as real addresses.</p>}
            <fieldset className="card"><legend>Top-pick address check</legend>
              <label className="hs-label" htmlFor="nick1">Top-pick nickname</label><input className="hs-native" id="nick1" value={nick1} onChange={(e) => setNick1(e.target.value)} maxLength={40} />
              <label className="hs-label" htmlFor="addr1">Top-pick address</label><input className="hs-native" id="addr1" value={addr1} onChange={(e) => { setAddr1(e.target.value); setConf1(false); setHits1([]); setMsg1(""); }} maxLength={120} placeholder="e.g. 1 Fictional Road (enter your real address)" />
              <div className="hs-actions"><Button label={busy1 ? "Checking…" : "Check with official search"} variant="secondary" size="sm" onClick={() => geocode(1)} /><a href={kakaoLink1} target="_blank" rel="noreferrer">Find it on the official map</a></div>
              {msg1 && <p role="status" className="hint">{msg1}</p>}
              {hits1.length > 0 && <ul aria-label="Top-pick search results">{hits1.map((h, i) => (<li key={i}><button type="button" onClick={() => { setAddr1(h.address); setConf1(false); setHits1([]); setLat1(""); setLng1(""); setMsg1("Selected: " + h.address + ". Verify it, then tick the checkbox."); }}>Select · {h.address}</button></li>))}</ul>}
              <details><summary>Enter latitude and longitude manually (optional, unverified)</summary><label className="hs-label" htmlFor="lat1">Latitude</label><input className="hs-native" id="lat1" value={lat1} onChange={(e) => setLat1(e.target.value)} inputMode="decimal" maxLength={20} placeholder="e.g. 37.55" /><label className="hs-label" htmlFor="lng1">Longitude</label><input className="hs-native" id="lng1" value={lng1} onChange={(e) => setLng1(e.target.value)} inputMode="decimal" maxLength={20} placeholder="e.g. 126.91" /><p className="hint">Manually entered coordinates are shown as unverified.</p></details>
              <label className="hs-check"><input type="checkbox" checked={conf1} onChange={(e) => setConf1(e.target.checked)} /> I verified this address myself (coordinates may be unverified)</label>
            </fieldset>
            {!showSecond ? <div className="hs-actions"><Button label="+ Add a second home" variant="secondary" size="sm" onClick={() => setShowSecond(true)} /></div> : (<fieldset className="card"><legend>Second home (optional)</legend><label className="hs-label" htmlFor="nick2">Second nickname</label><input className="hs-native" id="nick2" value={nick2} onChange={(e) => setNick2(e.target.value)} maxLength={40} /><label className="hs-label" htmlFor="addr2">Second address</label><input className="hs-native" id="addr2" value={addr2} onChange={(e) => { setAddr2(e.target.value); setConf2(false); setHits2([]); setMsg2(""); }} maxLength={120} /><div className="hs-actions"><Button label={busy2 ? "Checking…" : "Check with official search"} variant="secondary" size="sm" onClick={() => geocode(2)} /><a href={kakaoLink2} target="_blank" rel="noreferrer">Find it on the official map</a></div>{msg2 && <p role="status" className="hint">{msg2}</p>}{hits2.length > 0 && <ul aria-label="Second search results">{hits2.map((h, i) => (<li key={i}><button type="button" onClick={() => { setAddr2(h.address); setConf2(false); setHits2([]); setLat2(""); setLng2(""); setMsg2("Selected: " + h.address); }}>Select · {h.address}</button></li>))}</ul>}<details><summary>Enter latitude and longitude manually (optional, unverified)</summary><label className="hs-label" htmlFor="lat2">Latitude</label><input className="hs-native" id="lat2" value={lat2} onChange={(e) => setLat2(e.target.value)} inputMode="decimal" maxLength={20} /><label className="hs-label" htmlFor="lng2">Longitude</label><input className="hs-native" id="lng2" value={lng2} onChange={(e) => setLng2(e.target.value)} inputMode="decimal" maxLength={20} /></details><label className="hs-check"><input type="checkbox" checked={conf2} onChange={(e) => setConf2(e.target.checked)} /> I verified the second address myself</label><div className="hs-actions"><button type="button" className="hs-ghost" onClick={() => { setShowSecond(false); setAddr2(""); setConf2(false); setHits2([]); setLat2(""); setLng2(""); setMsg2(""); }}>Remove second home</button></div></fieldset>)}
            <div className="hs-actions"><Button label="Start with my address" variant="primary" onClick={doLive} /></div>
          </details>
          <div className="import-box"><h2>Import a record</h2><SessionImport session={session} onImport={onImport} onMessage={setImportMsg} />{importMsg && <p role="status" className="hint">{importMsg}</p>}</div>
        </div>
        <aside className="preview" aria-label="Neighborhood preview"><p><Badge label="Live preview · fictional Solan Village" variant="neutral" /></p><NeighborhoodScene sim={previewSim} homeId={previewHome} stopId={previewStop} onSelectHome={setPreviewHome} onSelectStop={(s) => setPreviewStop(s as StopId)} onSimChange={setPreviewSim} /><p className="hint">A tactile schematic with two homes, three stops, shops, a station, a park, and a walking route. Try the time slider and Night button.</p></aside>
      </div>
    </section>
  );
}