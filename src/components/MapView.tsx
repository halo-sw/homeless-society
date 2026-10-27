import { useEffect, useRef, useState } from "react";
import NeighborhoodScene from "./NeighborhoodScene";
import { isPublicDemo } from "../lib/api";
import { DEFAULT_SIM } from "../domain/simulation";
import type { SimState } from "../domain/simulation";
import { STOPS, type Candidate, type Session, type StopId } from "../domain/session";
interface KakaoMapsNS { load(cb: () => void): void; Map: new (el: HTMLElement, opt: { center: unknown; level: number }) => { setCenter(c: unknown): void }; LatLng: new (lat: number, lng: number) => unknown; Marker: new (opt: { position: unknown }) => { setMap(m: unknown): void } }
declare global { interface Window { kakao?: { maps: KakaoMapsNS } } }
let scriptPromise: Promise<KakaoMapsNS | null> | null = null;
function loadKakao(key: string): Promise<KakaoMapsNS | null> {
  if (typeof window !== "undefined" && window.kakao?.maps) return Promise.resolve(window.kakao.maps);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + encodeURIComponent(key) + "&autoload=false";
    s.async = true;
    s.onload = () => { try { window.kakao?.maps.load(() => resolve(window.kakao?.maps ?? null)); } catch { scriptPromise = null; resolve(null); } };
    s.onerror = () => { scriptPromise = null; resolve(null); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}
export default function MapView({ session, candidate, stopId, sim, onSimChange, onSelectHome, onSelectStop }: { session: Session; candidate: Candidate; stopId: StopId; sim: SimState; onSimChange: (s: SimState) => void; onSelectHome?: (id: string) => void; onSelectStop?: (s: StopId) => void }) {
  const pub = isPublicDemo();
  const envKey = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_KAKAO_JS_KEY ?? "") as string;
  const jsKey = !pub && typeof envKey === "string" ? envKey : "";
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("");
  const [retry, setRetry] = useState(0);
  const effSim: SimState = sim ?? { ...DEFAULT_SIM };
  useEffect(() => { setStatus(""); }, [candidate.id, candidate.address]);
  useEffect(() => {
    if (session.mode !== "live" || pub) return;
    if (!jsKey || !candidate.coords) return;
    let alive = true;
    let marker: { setMap(m: unknown): void } | null = null;
    setStatus("Loading the official map…");
    loadKakao(jsKey).then((maps) => {
      if (!alive) return;
      if (!maps || !mapRef.current) { setStatus("Could not show the official map. Please use the official link below."); return; }
      try {
        const pos = new maps.LatLng(candidate.coords!.lat, candidate.coords!.lng);
        const map = new maps.Map(mapRef.current, { center: pos, level: 3 });
        marker = new maps.Marker({ position: pos });
        marker.setMap(map);
        setStatus(candidate.coords!.verified ? "Official map (address search result)" : "Official map (manually entered coordinates, unverified)");
      } catch { setStatus("Could not show the official map. Please use the official link below."); }
    });
    return () => { alive = false; try { marker?.setMap(null); } catch { } };
  }, [session.mode, pub, jsKey, candidate.coords, candidate.id, retry]);
  if (session.mode === "demo") {
    return (
      <figure aria-label="Solan Village fictional model">
        <NeighborhoodScene sim={effSim} homeId={candidate.id} stopId={stopId} onSelectHome={(id) => onSelectHome?.(id)} onSelectStop={(id) => onSelectStop?.(id as StopId)} onSimChange={onSimChange} />
        <figcaption>{candidate.nickname} · {STOPS.find((s) => s.id === stopId)?.label} — fictional schematic, not real geography.</figcaption>
        <div className="actions" role="group" aria-label="Choose a stop on the model">{STOPS.map((s, i) => (<button type="button" key={s.id} onClick={() => onSelectStop?.(s.id)} aria-pressed={s.id === stopId}>{i + 1}. {s.label}</button>))}</div>
      </figure>
    );
  }
  const link = "https://map.kakao.com/link/search/" + encodeURIComponent(candidate.address);
  if (!jsKey || !candidate.coords) {
    return (
      <div className="manual-map">
        <p><strong>Cannot show the map inline.</strong> Please check the address directly on the official map.</p>
        <p><a href={link} target="_blank" rel="noreferrer">Open {candidate.address} on the official map</a></p>
        <ul>{STOPS.map((s) => (<li key={s.id}>{s.label}: {s.topic}</li>))}</ul>
        <p className="hint">Schematics are never drawn as real geography for entered addresses.</p>
      </div>
    );
  }
  const failed = status.startsWith("Could not show");
  return (
    <div>
      <div ref={mapRef} className="livemap" role="application" aria-label="Official map area" />
      {failed && <div className="actions"><button type="button" onClick={() => setRetry((v) => v + 1)}>Retry</button></div>}
      <p className="hint">Source: Kakao · {candidate.coords.verified ? "address search result" : "manually entered (unverified)"} · <a href={link} target="_blank" rel="noreferrer">Open on the official map</a></p>
      {status && <p role="status" className="hint">{status}</p>}
    </div>
  );
}
