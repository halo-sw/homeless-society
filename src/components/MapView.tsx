import { useEffect, useRef, useState } from 'react';
import { STOPS, type Candidate, type Session, type StopId } from '../domain/session';
interface KakaoMapsNS { load(cb: () => void): void; Map: new (el: HTMLElement, opt: { center: unknown; level: number }) => { setCenter(c: unknown): void }; LatLng: new (lat: number, lng: number) => unknown; Marker: new (opt: { position: unknown }) => { setMap(m: unknown): void }; Roadview: new (el: HTMLElement) => { setPanoId(id: number, pos: unknown): void }; RoadviewClient: new () => { getNearestPanoId(pos: unknown, r: number, cb: (id: number | null) => void): void } }
declare global { interface Window { kakao?: { maps: KakaoMapsNS } } }
let scriptPromise: Promise<KakaoMapsNS | null> | null = null;
function loadKakao(key: string): Promise<KakaoMapsNS | null> {
  if (typeof window !== 'undefined' && window.kakao?.maps) return Promise.resolve(window.kakao.maps);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + encodeURIComponent(key) + '&autoload=false';
    s.async = true;
    s.onload = () => { try { window.kakao?.maps.load(() => resolve(window.kakao?.maps ?? null)); } catch { scriptPromise = null; resolve(null); } };
    s.onerror = () => { scriptPromise = null; resolve(null); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}
function stopIndex(id: StopId): number { return STOPS.findIndex((s) => s.id === id); }
export default function MapView({ session, candidate, stopId, onSelectStop }: { session: Session; candidate: Candidate; stopId: StopId; onSelectStop?: (s: StopId) => void }) {
  const envKey = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_KAKAO_JS_KEY ?? '') as string;
  const jsKey = typeof envKey === 'string' ? envKey : '';
  const mapRef = useRef<HTMLDivElement>(null); const roadRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'map' | 'road'>('map');
  const [status, setStatus] = useState(''); const [roadState, setRoadState] = useState<'idle' | 'loading' | 'ready' | 'missing'>('idle');
  const [retry, setRetry] = useState(0);
  useEffect(() => { setMode('map'); setRoadState('idle'); setStatus(''); }, [candidate.id, candidate.address]);
  useEffect(() => {
    if (session.mode !== 'live' || mode !== 'map') return;
    if (!jsKey || !candidate.coords) return;
    let alive = true;
    let marker: { setMap(m: unknown): void } | null = null;
    setStatus('공식 지도를 불러오는 중…');
    loadKakao(jsKey).then((maps) => {
      if (!alive) return;
      if (!maps || !mapRef.current) { setStatus('공식 지도를 표시하지 못했습니다. 아래 외부 링크를 이용해 주세요.'); return; }
      try {
        const pos = new maps.LatLng(candidate.coords!.lat, candidate.coords!.lng);
        const map = new maps.Map(mapRef.current, { center: pos, level: 3 });
        marker = new maps.Marker({ position: pos });
        marker.setMap(map);
        setStatus(candidate.coords!.verified ? '공식 지도 표시 중 (주소 검색결과)' : '공식 지도 표시 중 (직접 입력 좌표, 미검증)');
      } catch { setStatus('공식 지도를 표시하지 못했습니다. 아래 외부 링크를 이용해 주세요.'); }
    });
    return () => { alive = false; try { marker?.setMap(null); } catch { /* noop */ } };
  }, [session.mode, mode, jsKey, candidate.coords, candidate.id, retry]);
  useEffect(() => {
    if (session.mode !== 'live' || mode !== 'road') return;
    if (!jsKey || !candidate.coords) return;
    let alive = true;
    setRoadState('loading');
    const timer = window.setTimeout(() => { if (alive) setRoadState('missing'); }, 8000);
    loadKakao(jsKey).then((maps) => {
      if (!alive) return;
      if (!maps || !roadRef.current) { window.clearTimeout(timer); setRoadState('missing'); return; }
      try {
        const pos = new maps.LatLng(candidate.coords!.lat, candidate.coords!.lng);
        const rv = new maps.Roadview(roadRef.current);
        const client = new maps.RoadviewClient();
        client.getNearestPanoId(pos, 50, (id) => {
          if (!alive) return;
          window.clearTimeout(timer);
          if (id === null) setRoadState('missing');
          else { try { rv.setPanoId(id, pos); setRoadState('ready'); } catch { setRoadState('missing'); } }
        });
      } catch { window.clearTimeout(timer); if (alive) setRoadState('missing'); }
    });
    return () => { alive = false; window.clearTimeout(timer); };
  }, [session.mode, mode, jsKey, candidate.coords, candidate.id, retry]);
  if (session.mode === 'demo') {
    const selIdx = stopIndex(stopId);
    const isA = candidate.id === 'demo-a';
    return (
      <figure aria-label="가상 동네 개념도">
        <svg viewBox="0 0 400 300" role="img" aria-label="솔안마을 가상 개념도" className="schem">
          <rect x="0" y="0" width="400" height="300" fill="#f1ecdd" />
          <rect x="20" y="60" width="150" height="90" fill={isA ? '#f6efdc' : '#e6dfc9'} stroke="#2f5d3a" strokeWidth={isA ? 3 : 1} />
          <rect x="230" y="60" width="150" height="90" fill={!isA ? '#f6efdc' : '#e6dfc9'} stroke="#2f5d3a" strokeWidth={!isA ? 3 : 1} />
          <rect x="20" y="200" width="360" height="60" fill="#dfe8d8" stroke="#2f5d3a" />
          <text x="200" y="232" textAnchor="middle" fontSize="12" fill="#2f5d3a">가상 솔안공원</text>
          <path d="M0 180 L400 180" stroke="#8a8a7a" strokeWidth="10" />
          <path d="M200 0 L200 300" stroke="#8a8a7a" strokeWidth="7" />
          <path d="M30 260 L120 180 L200 180 L300 90" stroke="#2f5d3a" strokeWidth="4" fill="none" strokeDasharray="9 6" />
          {[0, 1, 2].map((i) => {
            const cx = [120, 200, 300][i]; const cy = [180, 180, 90][i];
            const on = i === selIdx;
            return <g key={i}><circle cx={cx} cy={cy} r={on ? 16 : 12} fill={on ? '#b0722e' : '#2f5d3a'} stroke="#fff" strokeWidth={on ? 3 : 1} /><text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fill="#fff">{i + 1}</text></g>;
          })}
          <text x="95" y="120" textAnchor="middle" fontSize="13" fontWeight={isA ? 'bold' : 'normal'}>해뜰집(가상)</text>
          <text x="305" y="120" textAnchor="middle" fontSize="13" fontWeight={!isA ? 'bold' : 'normal'}>달빛집(가상)</text>
          <text x="200" y="288" textAnchor="middle" fontSize="11">개념도: 실제 거리·소요시간 아님</text>
        </svg>
        <figcaption>{candidate.nickname} · {STOPS.find((s) => s.id === stopId)?.label} — 가상 개념도이며 실제 지리가 아닙니다.</figcaption>
        <div className="actions" role="group" aria-label="개념도 지점 선택">{STOPS.map((s, i) => (<button type="button" key={s.id} onClick={() => onSelectStop?.(s.id)} aria-pressed={s.id === stopId}>{i + 1}. {s.label}</button>))}</div>
      </figure>
    );
  }
  const link = 'https://map.kakao.com/link/search/' + encodeURIComponent(candidate.address);
  if (!jsKey || !candidate.coords) {
    return (
      <div className="manual-map">
        <p><strong>지도를 바로 표시할 수 없습니다.</strong> 아래 공식 지도 링크에서 주소를 직접 확인해 주세요.</p>
        <p><a href={link} target="_blank" rel="noreferrer">공식 지도에서 {candidate.address} 열기</a></p>
        <ul>{STOPS.map((s) => (<li key={s.id}>{s.label}: {s.topic}</li>))}</ul>
        <p className="hint">개념도를 실제 주소 지리로 표시하지 않습니다.</p>
      </div>
    );
  }
  const failed = (mode === 'map' && status.startsWith('공식 지도를 표시하지 못')) || (mode === 'road' && roadState === 'missing');
  return (
    <div>
      <div className="actions" role="group" aria-label="지도 방식 선택">
        <button type="button" onClick={() => setMode('map')} aria-pressed={mode === 'map'}>지도</button>
        <button type="button" onClick={() => setMode('road')} aria-pressed={mode === 'road'}>로드뷰</button>
      </div>
      {mode === 'map' ? <div ref={mapRef} className="livemap" role="application" aria-label="공식 지도 영역" /> : <div ref={roadRef} className="livemap" role="application" aria-label="공식 로드뷰 영역" />}
      {mode === 'road' && roadState === 'missing' && <p role="status" className="notice">이 위치에서는 로드뷰를 사용할 수 없습니다. 공식 지도 링크에서 직접 확인해 주세요.</p>}
      {mode === 'road' && roadState === 'loading' && <p role="status" className="hint">로드뷰 확인 중…</p>}
      {failed && <div className="actions"><button type="button" onClick={() => setRetry((v) => v + 1)}>다시 시도</button></div>}
      <p className="hint">출처: © Kakao · {candidate.coords.verified ? '주소 검색결과' : '직접 입력 좌표(미검증)'} · <a href={link} target="_blank" rel="noreferrer">공식 지도에서 열기</a></p>
      {status && mode === 'map' && <p role="status" className="hint">{status}</p>}
    </div>
  );
}
