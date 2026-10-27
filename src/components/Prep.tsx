import { useRef, useState } from 'react';
import { LIMITS, PRIORITY_OPTIONS, hasWork, startDemoSession, startLiveSession, togglePriorityWithLimit, type Session } from '../domain/session';
import SessionImport from './SessionImport';
interface GeoHit { address: string; lat: number; lng: number }
export default function Prep({ session, onChange, onStart, onImport }: { session: Session; onChange: (s: Session) => void; onStart: (s: Session) => void; onImport: (s: Session) => void }) {
  const isLive = session.mode === 'live';
  const c0 = isLive ? session.candidates[0] : undefined;
  const c1 = isLive ? session.candidates[1] : undefined;
  const [nick1, setNick1] = useState(c0?.nickname ?? '1순위 후보');
  const [addr1, setAddr1] = useState(c0?.address ?? '');
  const [nick2, setNick2] = useState(c1?.nickname ?? '비교 후보');
  const [addr2, setAddr2] = useState(c1?.address ?? '');
  const [showSecond, setShowSecond] = useState(!!c1);
  const [conf1, setConf1] = useState(!!c0?.confirmed);
  const [conf2, setConf2] = useState(!!c1?.confirmed);
  const [hits1, setHits1] = useState<GeoHit[]>([]);
  const [hits2, setHits2] = useState<GeoHit[]>([]);
  const [sel1, setSel1] = useState<GeoHit | null>(() => (c0?.coords && c0.coords.verified ? { address: c0.address, lat: c0.coords.lat, lng: c0.coords.lng } : null));
  const [sel2, setSel2] = useState<GeoHit | null>(() => (c1?.coords && c1.coords.verified ? { address: c1.address, lat: c1.coords.lat, lng: c1.coords.lng } : null));
  const [busy1, setBusy1] = useState(false);
  const [busy2, setBusy2] = useState(false);
  const [msg1, setMsg1] = useState('');
  const [msg2, setMsg2] = useState('');
  const [lat1, setLat1] = useState(() => (c0?.coords && !c0.coords.verified ? String(c0.coords.lat) : ''));
  const [lng1, setLng1] = useState(() => (c0?.coords && !c0.coords.verified ? String(c0.coords.lng) : ''));
  const [lat2, setLat2] = useState(() => (c1?.coords && !c1.coords.verified ? String(c1.coords.lat) : ''));
  const [lng2, setLng2] = useState(() => (c1?.coords && !c1.coords.verified ? String(c1.coords.lng) : ''));
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState('');
  const [limitMsg, setLimitMsg] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const seq1 = useRef(0);
  const seq2 = useRef(0);
  const addr1Ref = useRef(addr1);
  const addr2Ref = useRef(addr2);
  addr1Ref.current = addr1;
  addr2Ref.current = addr2;
  const work = hasWork(session);
  function toggle(p: string) { const r = togglePriorityWithLimit(session.priorities, p); onChange({ ...session, priorities: r.next }); setLimitMsg(r.limited ? '관심사는 최대 3개까지 선택할 수 있어요.' : ''); }
  async function geocode(which: 1 | 2) {
    const q = (which === 1 ? addr1Ref.current : addr2Ref.current).trim();
    const setBusy = which === 1 ? setBusy1 : setBusy2;
    const setMsg = which === 1 ? setMsg1 : setMsg2;
    const setHits = which === 1 ? setHits1 : setHits2;
    if (!q) { setMsg('주소를 먼저 입력해 주세요.'); return; }
    const seqRef = which === 1 ? seq1 : seq2;
    const my = ++seqRef.current;
    setBusy(true); setMsg('주소 확인 중…');
    try {
      const r = await fetch('/api/geocode', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) });
      if (seqRef.current !== my) return;
      const cur = (which === 1 ? addr1Ref.current : addr2Ref.current).trim();
      if (cur !== q) return;
      const j = await r.json().catch(() => ({} as { error?: string; results?: GeoHit[] }));
      if (r.status === 501) { setMsg('주소 검색 키가 없어 자동 검색을 사용할 수 없습니다. 공식 지도 링크에서 직접 확인한 뒤 확인란에 체크해 주세요.'); setHits([]); }
      else if (!r.ok) setMsg('검색 실패: ' + (((j as { error?: string }).error) || '다시 시도해 주세요.'));
      else { const list: GeoHit[] = Array.isArray((j as { results?: unknown }).results) ? ((j as { results: GeoHit[] }).results).slice(0, 5) : []; setHits(list); setMsg(list.length ? '아래 후보 중 실제 주소 하나를 선택해 주세요.' : '검색 결과가 없습니다. 철자를 확인하거나 공식 지도에서 직접 확인해 주세요.'); }
    } catch { if (seqRef.current === my) setMsg('네트워크 오류입니다. 공식 지도 링크에서 직접 확인해 주세요.'); }
    finally { if (seqRef.current === my) setBusy(false); }
  }
  function parseManual(latS: string, lngS: string): { ok: boolean; lat?: number; lng?: number; error?: string } {
    if (!latS.trim() && !lngS.trim()) return { ok: true };
    if (!latS.trim() || !lngS.trim()) return { ok: false, error: '위도·경도는 함께 입력해 주세요.' };
    const la = Number(latS); const ln = Number(lngS);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return { ok: false, error: '위도·경도는 숫자로 입력해 주세요.' };
    if (la < -90 || la > 90 || ln < -180 || ln > 180) return { ok: false, error: '위도 -90~90, 경도 -180~180 범위로 입력해 주세요.' };
    return { ok: true, lat: la, lng: ln };
  }
  function previewAddrs(): { id: string; addr: string }[] {
    const out = [{ id: 'live-a', addr: addr1.trim() }];
    if (showSecond && addr2.trim()) out.push({ id: 'live-b', addr: addr2.trim() });
    return out;
  }
  function liveStartWouldDrop(): boolean {
    if (!work) return false;
    if (session.mode !== 'live') return true;
    const m = new Map(previewAddrs().map((p) => [p.id, p.addr]));
    for (const o of session.observations) {
      const na = m.get(o.candidateId);
      if (na === undefined) return true;
      const oldAddr = session.candidates.find((c) => c.id === o.candidateId)?.address.trim();
      if (oldAddr !== na) return true;
    }
    for (const mm of session.visitMemos ?? []) {
      const na = m.get(mm.candidateId);
      if (na === undefined) return true;
      const oldAddr = session.candidates.find((c) => c.id === mm.candidateId)?.address.trim();
      if (oldAddr !== na) return true;
    }
    if (session.visitNotes.trim() && session.observations.length === 0) return true;
    return false;
  }
  function demoRestartWouldDrop(): boolean {
    if (!work) return false;
    if (session.mode !== 'demo') return true;
    return session.observations.length > 0 || (session.visitMemos ?? []).length > 0 || session.visitNotes.trim() !== '';
  }
  const showAck = liveStartWouldDrop() || demoRestartWouldDrop();
  function doDemo() {
    setErr('');
    if (demoRestartWouldDrop() && !ack) { setErr('가상 예시로 새로 시작하면 기존 기록이 지워집니다. 아래 확인란에 체크한 뒤 다시 눌러 주세요.'); return; }
    onStart(startDemoSession(session));
  }
  function doLive() {
    setErr('');
    const a1 = addr1.trim();
    if (!a1) { setErr('1순위 주소를 입력해 주세요.'); return; }
    if (!conf1) { setErr('1순위 주소가 맞는지 직접 확인하고 확인란에 체크해 주세요.'); return; }
    const m1 = parseManual(lat1, lng1); if (!m1.ok) { setErr('1순위 좌표: ' + m1.error); return; }
    let second: { nick: string; addr: string } | null = null;
    if (showSecond && addr2.trim()) {
      if (!conf2) { setErr('비교 후보 주소도 직접 확인하고 확인란에 체크해 주세요.'); return; }
      const m2 = parseManual(lat2, lng2); if (!m2.ok) { setErr('비교 후보 좌표: ' + m2.error); return; }
      second = { nick: nick2.trim() || '비교 후보', addr: addr2.trim() };
    }
    if (liveStartWouldDrop() && !ack) { setErr('입력한 주소로 새로 시작하면 기존 기록 일부가 지워집니다. 아래 확인란에 체크한 뒤 다시 눌러 주세요.'); return; }
    const coords1 = sel1 ? { lat: sel1.lat, lng: sel1.lng, verified: true } : m1.lat !== undefined && m1.lng !== undefined ? { lat: m1.lat, lng: m1.lng, verified: false } : null;
    const cands = [{ id: 'live-a', nickname: nick1.trim() || '1순위 후보', address: a1, source: 'user-confirmed' as const, coords: coords1, confirmed: true }];
    if (second) { const m2 = parseManual(lat2, lng2); const coords2 = sel2 ? { lat: sel2.lat, lng: sel2.lng, verified: true } : m2.lat !== undefined && m2.lng !== undefined ? { lat: m2.lat, lng: m2.lng, verified: false } : null; cands.push({ id: 'live-b', nickname: second.nick, address: second.addr, source: 'user-confirmed' as const, coords: coords2, confirmed: true }); }
    onStart(startLiveSession(session, cands));
  }
  function chooseHit(which: 1 | 2, h: GeoHit) {
    if (which === 1) { setAddr1(h.address); addr1Ref.current = h.address; setSel1(h); setLat1(''); setLng1(''); setConf1(false); setHits1([]); setMsg1('선택됨: ' + h.address + '. 주소가 맞는지 확인한 뒤 확인란에 체크해 주세요.'); }
    else { setAddr2(h.address); addr2Ref.current = h.address; setSel2(h); setLat2(''); setLng2(''); setConf2(false); setHits2([]); setMsg2('선택됨: ' + h.address + '. 주소가 맞는지 확인한 뒤 확인란에 체크해 주세요.'); }
  }
  function editAddr1(v: string) { setAddr1(v); addr1Ref.current = v; seq1.current += 1; setConf1(false); setSel1(null); setHits1([]); setLat1(''); setLng1(''); setMsg1(''); }
  function editAddr2(v: string) { setAddr2(v); addr2Ref.current = v; seq2.current += 1; setConf2(false); setSel2(null); setHits2([]); setLat2(''); setLng2(''); setMsg2(''); }
  function removeSecond() {
    const targetId = c1?.id ?? 'live-b';
    const has = session.observations.some((o) => o.candidateId === targetId) || (session.visitMemos ?? []).some((m) => m.candidateId === targetId);
    if (has && !window.confirm('비교 후보의 기록이 함께 지워집니다. 지울까요?')) return;
    seq2.current += 1;
    setShowSecond(false); setAddr2(''); setConf2(false); setSel2(null); setHits2([]); setLat2(''); setLng2(''); setMsg2('');
  }
  const kakaoLink1 = addr1.trim() ? 'https://map.kakao.com/link/search/' + encodeURIComponent(addr1.trim()) : 'https://map.kakao.com';
  const kakaoLink2 = addr2.trim() ? 'https://map.kakao.com/link/search/' + encodeURIComponent(addr2.trim()) : 'https://map.kakao.com';
  return (
    <section aria-labelledby="prep-h">
      <h1 id="prep-h" tabIndex={-1} className="stage-title">어떤 집을 볼까요?</h1>
      <p className="lede">중요한 집 선택, 남의 설명만으로 결정하지 않도록. 직접 확인할 두 곳을 정합니다.</p>
      <div className="prep-grid">
        <div>
          {session.mode === 'demo' && session.candidates.length > 0 && <p className="demo-banner">가상 예시 세션입니다. 아래 입력은 비어 있으며, 가상 주소가 실제 주소로 저장되지 않습니다.</p>}
          <fieldset className="card">
            <legend>1순위 후보 주소 확인</legend>
            <label htmlFor="nick1">1순위 별명</label><input id="nick1" value={nick1} onChange={(e) => setNick1(e.target.value)} maxLength={40} />
            <label htmlFor="addr1">1순위 주소</label><input id="addr1" value={addr1} onChange={(e) => editAddr1(e.target.value)} maxLength={120} placeholder="예: 서울특별시 마포구 ..." />
            <div className="actions"><button type="button" onClick={() => geocode(1)} disabled={busy1}>{busy1 ? '확인 중…' : '공식 주소 검색으로 확인'}</button><a href={kakaoLink1} target="_blank" rel="noreferrer">공식 지도에서 직접 찾기</a></div>
            {msg1 && <p role="status" className="hint">{msg1}</p>}
            {hits1.length > 0 && <ul aria-label="1순위 주소 검색 결과">{hits1.map((h, i) => (<li key={i}><button type="button" onClick={() => chooseHit(1, h)} aria-pressed={sel1?.address === h.address && sel1?.lat === h.lat}>{sel1?.address === h.address ? '선택됨' : '선택'} · {h.address}</button></li>))}</ul>}
            {sel1 && <p className="hint">선택된 검색결과 좌표를 사용합니다 (주소 검색결과, 검증됨). 주소를 고치면 선택이 취소됩니다.</p>}
            <details><summary>직접 위도·경도 입력(선택, 미검증)</summary><label htmlFor="lat1">위도</label><input id="lat1" value={lat1} onChange={(e) => { setLat1(e.target.value); setSel1(null); }} inputMode="decimal" maxLength={20} placeholder="예: 37.55" /><label htmlFor="lng1">경도</label><input id="lng1" value={lng1} onChange={(e) => { setLng1(e.target.value); setSel1(null); }} inputMode="decimal" maxLength={20} placeholder="예: 126.91" /><p className="hint">직접 입력한 좌표는 미검증으로 표시됩니다.</p></details>
            <label className="check"><input type="checkbox" checked={conf1} onChange={(e) => setConf1(e.target.checked)} /> 1순위 주소가 맞음을 직접 확인했습니다 (좌표 미검증일 수 있음)</label>
          </fieldset>
          {!showSecond ? <div className="actions"><button type="button" onClick={() => setShowSecond(true)}>+ 비교할 집 추가</button></div> : (
            <fieldset className="card">
              <legend>비교 후보 (선택)</legend>
              <label htmlFor="nick2">비교 후보 별명</label><input id="nick2" value={nick2} onChange={(e) => setNick2(e.target.value)} maxLength={40} />
              <label htmlFor="addr2">비교 후보 주소</label><input id="addr2" value={addr2} onChange={(e) => editAddr2(e.target.value)} maxLength={120} />
              <div className="actions"><button type="button" onClick={() => geocode(2)} disabled={busy2}>{busy2 ? '확인 중…' : '공식 주소 검색으로 확인'}</button><a href={kakaoLink2} target="_blank" rel="noreferrer">공식 지도에서 직접 찾기</a></div>
              {msg2 && <p role="status" className="hint">{msg2}</p>}
              {hits2.length > 0 && <ul aria-label="비교 후보 주소 검색 결과">{hits2.map((h, i) => (<li key={i}><button type="button" onClick={() => chooseHit(2, h)} aria-pressed={sel2?.address === h.address && sel2?.lat === h.lat}>{sel2?.address === h.address ? '선택됨' : '선택'} · {h.address}</button></li>))}</ul>}
              <details><summary>직접 위도·경도 입력(선택, 미검증)</summary><label htmlFor="lat2">위도</label><input id="lat2" value={lat2} onChange={(e) => { setLat2(e.target.value); setSel2(null); }} inputMode="decimal" maxLength={20} /><label htmlFor="lng2">경도</label><input id="lng2" value={lng2} onChange={(e) => { setLng2(e.target.value); setSel2(null); }} inputMode="decimal" maxLength={20} /><p className="hint">직접 입력한 좌표는 미검증으로 표시됩니다.</p></details>
              <label className="check"><input type="checkbox" checked={conf2} onChange={(e) => setConf2(e.target.checked)} /> 비교 후보 주소가 맞음을 직접 확인했습니다</label>
              <div className="actions"><button type="button" className="ghost" onClick={removeSecond}>비교 후보 지우기</button></div>
            </fieldset>
          )}
          <p className="hint">두 집은 같은 동네에서 비교하면 동선이 겹쳐 보기 편합니다. 직접 정하는 계획 기준이며 자동 거리 검사는 하지 않습니다.</p>
          <h2>관심사 최대 3개 ({session.priorities.length}/3)</h2>
          <div className="chips" role="group" aria-label="관심사 선택">{PRIORITY_OPTIONS.map((p) => (<button type="button" key={p} aria-pressed={session.priorities.includes(p)} onClick={() => toggle(p)}>{p}</button>))}</div>
          {limitMsg && <p role="status" className="hint">{limitMsg}</p>}
          <h2><label htmlFor="iq">처음 궁금한 점 (선택)</label></h2>
          <textarea id="iq" value={session.initialQuestions} onChange={(e) => onChange({ ...session, initialQuestions: e.target.value.slice(0, LIMITS.textLen) })} rows={3} maxLength={2000} placeholder="예: 밤에 골목이 밝은지 궁금해요" />
          <p className="hint">{session.initialQuestions.length}/2000 · 다음: 세 곳(집 주변·생활 동선·건물 입구)을 둘러봅니다.</p>
          {showAck && <label className="check"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> 기존 기록을 지우고 새로 시작하는 것을 확인합니다</label>}
          {err && <p role="alert" className="error">{err}</p>}
          <div className="actions start-actions">
            <button type="button" className="primary" onClick={doLive}>내 주소로 시작</button>
          </div>
          <p className="hint">가상 예시로 체험은 실존하지 않는 솔안마을 가정으로 새로 시작합니다. 내 주소로 시작은 입력한 주소마다 직접 확인이 필요합니다.</p>
          <div className="import-box">
            <h2>기록 가져오기</h2>
            <SessionImport session={session} onImport={onImport} onMessage={setImportMsg} />
            {importMsg && <p role="status" className="hint">{importMsg}</p>}
          </div>
        </div>
        <aside className="preview" aria-label="동네 미리보기">
          <p className="tag">가상 예시</p>
          <svg viewBox="0 0 320 220" role="img" aria-label="솔안마을 가상 예시 개념도" className="schem">
            <rect x="0" y="0" width="320" height="220" fill="#f1ecdd" />
            <rect x="18" y="30" width="110" height="70" fill="#e4dcc6" stroke="#2f5d3a" strokeWidth="1" />
            <rect x="192" y="30" width="110" height="70" fill="#e4dcc6" stroke="#2f5d3a" strokeWidth="1" />
            <rect x="18" y="130" width="284" height="56" fill="#dfe8d8" stroke="#2f5d3a" strokeWidth="1" />
            <text x="60" y="150" fontSize="11" fill="#2f5d3a">가상 공원</text>
            <path d="M0 116 L320 116" stroke="#8a8a7a" strokeWidth="8" />
            <path d="M150 0 L150 220" stroke="#8a8a7a" strokeWidth="6" />
            <path d="M40 200 L120 116 L230 116 L280 40" stroke="#b0722e" strokeWidth="3" fill="none" strokeDasharray="7 5" />
            <circle cx="120" cy="116" r="9" fill="#2f5d3a" /><circle cx="230" cy="116" r="9" fill="#b0722e" />
            <text x="120" y="100" textAnchor="middle" fontSize="12">해뜰집</text>
            <text x="230" y="100" textAnchor="middle" fontSize="12">달빛집</text>
            <text x="160" y="210" textAnchor="middle" fontSize="10">개념도이며 실제 거리 아님</text>
          </svg>
          <p className="hint">솔안마을 가상 예시 개념도입니다. 실제 지리가 아니며, 체험용 동선만 보여줍니다.</p>
          <button type="button" onClick={doDemo}>가상 예시로 체험</button>
        </aside>
      </div>
    </section>
  );
}
