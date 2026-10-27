import { useEffect, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { dealYmdToMonthInput, monthInputToDealYmd } from "../domain/housing";
import { fetchTrades, searchRegions, type RegionHit } from "../lib/housingApi";
import { emptyHousing, type HousingState, type Session } from "../domain/session";
export default function DistrictSearch({ session, onChange }: { session: Session; onChange: (s: Session) => void }) {
  const housing: HousingState = session.housing ?? emptyHousing();
  const [q, setQ] = useState(housing.region?.query ?? "마포구");
  const [hits, setHits] = useState<RegionHit[]>([]);
  const [status, setStatus] = useState(housing.tradesStatus || "");
  const [busy, setBusy] = useState(false);
  const [monthInput, setMonthInput] = useState(dealYmdToMonthInput(housing.month) || "");
  const [asset, setAsset] = useState(housing.asset || "apartment");
  const seq = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  useEffect(() => { seq.current++; setBusy(false); }, [q, monthInput, asset]);
  async function search() {
    const id = ++seq.current;
    setBusy(true); setStatus("Searching districts…");
    try { const out = await searchRegions(q); if (seq.current !== id) return; setHits(out.results); setStatus(out.results.length ? out.results.length + " district(s) found. Pick one." : "No districts found. Check spelling."); }
    catch (e) { if (seq.current !== id) return; setStatus("District search failed: " + (e as Error).message + ". No demo data is filled in."); setHits([]); }
    finally { if (seq.current === id) setBusy(false); }
  }
  function pick(r: RegionHit) {
    seq.current++;
    setBusy(false);
    const base = sessionRef.current.housing ?? housing;
    const next: HousingState = { ...base, region: { lawd_cd: r.lawd_cd, name: r.name, query: q.trim() }, month: base.month, asset, trades: null, tradesStatus: "Selected district: " + r.name + " (" + r.lawd_cd + "). Now load sales." };
    onChange({ ...sessionRef.current, housing: next }); setStatus(next.tradesStatus);
  }
  async function loadTrades() {
    const base0 = sessionRef.current.housing ?? housing;
    const region = base0.region;
    if (!region) { setStatus("Pick a verified district first."); return; }
    const ymd = monthInputToDealYmd(monthInput);
    if (!ymd) { setStatus("Pick a valid month."); return; }
    const id = ++seq.current;
    const reqLawd = region.lawd_cd; const reqYmd = ymd; const reqAsset = asset;
    setBusy(true); setStatus("Loading past sales for " + reqLawd + " · " + reqYmd + " · " + reqAsset + "…");
    try {
      const out = await fetchTrades(reqLawd, reqYmd, reqAsset);
      if (seq.current !== id) return;
      const items = out.items.slice(0, 20);
      let msg = "";
      if (reqAsset === "single-house" && items.length === 0) msg = "House sales are unavailable in this sample for " + reqYmd + ".";
      else msg = out.items.length ? "Loaded " + out.summary.sample_count + " past sales for " + reqYmd + " · " + reqAsset + ". Stored " + items.length + " of them." : "No sales in this sample for " + reqYmd + " · " + reqAsset + ".";
      const base = sessionRef.current.housing ?? housing;
      const next: HousingState = { ...base, region, month: reqYmd, asset: reqAsset, trades: { items: items.map((i) => ({ ...i })), sample_count: out.summary.sample_count, median_price_10k: out.summary.median_price_10k, min_price_10k: out.summary.min_price_10k, max_price_10k: out.summary.max_price_10k, deal_ymd: reqYmd, asset: reqAsset, lawd_cd: reqLawd, fetchedAt: new Date().toISOString(), source: out.source }, tradesStatus: msg };
      onChange({ ...sessionRef.current, housing: next }); setStatus(msg);
    } catch (e) { if (seq.current !== id) return; const msg = "Trade request failed: " + (e as Error).message + ". No demo data is filled in."; setStatus(msg); const b2 = sessionRef.current.housing ?? housing; onChange({ ...sessionRef.current, housing: { ...b2, region, month: reqYmd, asset: reqAsset, trades: null, tradesStatus: msg } }); }
    finally { if (seq.current === id) setBusy(false); }
  }
  const t = housing.trades;
  return (
    <section aria-label="District research" className="hs-card">
      <h2>District research <Badge label={housing.region ? "selected" : "practice scene"} variant={housing.region ? "success" : "neutral"} /></h2>
      <p className="hint">Fictional practice scene and real district data stay separate. Transaction rows are past sales for the selected month, region, and asset only — never active listings or exact addresses. National coverage is not automated.</p>
      <label className="hs-label" htmlFor="district-q">District search (Korean accepted, e.g. 마포구)</label>
      <input className="hs-native" id="district-q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={30} placeholder="마포구" />
      <div className="hs-actions"><Button label={busy ? "Searching…" : "Search districts"} variant="primary" size="sm" onClick={search} isDisabled={busy} /></div>
      {hits.length > 0 && (<ul aria-label="District results">{hits.map((h) => (<li key={h.lawd_cd}><Button label={"Select · " + h.name + " (" + h.lawd_cd + ")"} variant="secondary" size="sm" onClick={() => pick(h)} /></li>))}</ul>)}
      {housing.region && <p className="hint" role="status" data-testid="selected-district">Selected district: {housing.region.name} · lawd_cd {housing.region.lawd_cd} · query {housing.region.query}</p>}
      <label className="hs-label" htmlFor="deal-month">Deal month (explicit input)</label>
      <input className="hs-native" id="deal-month" type="month" value={monthInput} onChange={(e) => setMonthInput(e.target.value)} />
      <SegmentedControl label="Asset type" value={asset} onChange={setAsset}><SegmentedControlItem value="apartment" label="Apartment" /><SegmentedControlItem value="officetel" label="Officetel" /><SegmentedControlItem value="villa" label="Villa" /><SegmentedControlItem value="single-house" label="House" /></SegmentedControl>
      <div className="hs-actions"><Button label={busy ? "Loading…" : "Load past sales"} variant="secondary" size="sm" onClick={loadTrades} isDisabled={busy} /></div>
      {t && (t.deal_ymd !== monthInputToDealYmd(monthInput) || t.asset !== asset || t.lawd_cd !== housing.region?.lawd_cd) && <p role="status" className="hint">Stale result: showing {t.lawd_cd} · {t.deal_ymd} · {t.asset}. Current request: {housing.region?.lawd_cd} · {monthInputToDealYmd(monthInput) ?? "no month"} · {asset}.</p>}
      {status && <p role="status" className="hint">{status}</p>}
      {t && (<div><p className="hint">Sample {t.sample_count} · {t.lawd_cd} · {t.deal_ymd} · {t.asset} · fetched {t.fetchedAt} · units: 10,000 KRW (85500 = KRW 855,000,000) · source: {t.source} <Badge label="public data" variant="info" /></p><p className="hint">Original: <a href="https://rt.molit.go.kr" target="_blank" rel="noreferrer">rt.molit.go.kr</a> · Proxy: <a href="https://k-skill-proxy.nomadamas.org" target="_blank" rel="noreferrer">k-skill-proxy.nomadamas.org</a></p><ul>{t.items.slice(0, 8).map((i, n) => (<li key={n} className="hint">{i.name} · {i.district} · {i.area_m2}㎡ · {i.floor}F · {(i.price_10k / 100).toLocaleString("en-US")}M KRW · {i.deal_date}</li>))}</ul></div>)}
    </section>
  );
}