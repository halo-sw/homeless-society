import { useEffect, useState } from 'react';
import Prep from './components/Prep';
import Visit from './components/Visit';
import Summary from './components/Summary';
import { canEnterStage, emptySession, hasConfirmedCandidate, restoreSession, saveSession, clearSaved, type Session, type StageId } from './domain/session';
const KEY = 'hs-session-v1';
const STAGES: { id: StageId; label: string }[] = [{ id: 'prep', label: '준비' }, { id: 'visit', label: '가상 임장' }, { id: 'summary', label: '정리·비교' }];
function loadInitial(): { session: Session; stage: StageId; notice: string; saved: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { session: emptySession(), stage: 'prep', notice: '', saved: false };
    const s = restoreSession(KEY);
    if (!s) return { session: emptySession(), stage: 'prep', notice: '이전 기록이 손상되어 새로 시작합니다. 필요한 경우 가져오기로 올바른 기록을 넣어 주세요.', saved: false };
    let st: StageId = s.stage ?? (s.candidates.length ? 'visit' : 'prep');
    if (!canEnterStage(st, s)) st = 'prep';
    return { session: s, stage: st, notice: '', saved: true };
  } catch { return { session: emptySession(), stage: 'prep', notice: '저장소를 읽지 못해 새로 시작합니다.', saved: false }; }
}
export default function App() {
  const [boot] = useState(loadInitial);
  const [session, setSession] = useState<Session>(boot.session);
  const [stage, setStage] = useState<StageId>(boot.stage);
  const [saveState, setSaveState] = useState(boot.saved ? '저장됨' : '저장된 기록 없음');
  const [notice, setNotice] = useState(boot.notice);
  useEffect(() => { const h = document.querySelector('main h1') as HTMLElement | null; if (h) h.focus(); }, [stage]);
  useEffect(() => { if (!hasConfirmedCandidate(session) && stage !== 'prep') setStage('prep'); }, [session, stage]);
  function persist(next: Session, st: StageId, label: string) {
    setSession(next);
    setStage(st);
    try { saveSession(KEY, next, st); setSaveState(label); }
    catch { setSaveState('저장 실패'); }
  }
  function update(next: Session) { persist(next, stage, '저장됨'); }
  function go(st: StageId) { if (!canEnterStage(st, session)) return; setStage(st); try { saveSession(KEY, session, st); } catch { setSaveState('저장 실패'); } }
  function startSession(next: Session) {
    if (!canEnterStage('visit', next)) return;
    setSession(next);
    setStage('visit');
    try { saveSession(KEY, next, 'visit'); setSaveState('저장됨'); }
    catch { setSaveState('저장 실패'); }
  }
  function handleImport(imported: Session) {
    const raw = (imported as unknown as { stage?: unknown }).stage;
    const valid = raw === 'prep' || raw === 'visit' || raw === 'summary' ? (raw as StageId) : null;
    let st: StageId | null = valid && canEnterStage(valid, imported) ? valid : null;
    if (!st) {
      if (canEnterStage('summary', imported)) st = 'summary';
      else if (canEnterStage('visit', imported)) st = 'visit';
      else if (hasConfirmedCandidate(imported)) st = 'visit';
      else st = 'prep';
      if (!canEnterStage(st, imported)) st = 'prep';
    }
    const { stage: _drop, ...rest } = imported as Session & { stage?: unknown };
    void _drop;
    const clean = rest as Session;
    setSession(clean);
    setStage(st);
    try { saveSession(KEY, clean, st); setSaveState('저장됨'); }
    catch { setSaveState('저장 실패'); }
    setNotice('기록을 가져왔습니다.');
  }
  function clearAll() {
    if (!window.confirm('저장된 내 기록을 모두 지울까요? 되돌릴 수 없습니다.')) return;
    try { clearSaved(KEY); setSession(emptySession()); setStage('prep'); setSaveState('저장된 기록 없음'); setNotice(''); }
    catch { setNotice('저장소 지우기에 실패했습니다. 브라우저 저장소 설정을 확인해 주세요.'); }
  }
  const modeBadge = session.candidates.length === 0 ? '준비 중' : session.mode === 'demo' ? '가상 예시 세션' : '내 주소 세션';
  return (
    <div className="page">
      <header className="masthead">
        <div className="brand"><span aria-hidden="true">⌂</span> Homeless Society <span className="mode-badge">{modeBadge}</span></div>
        <nav aria-label="진행 단계"><ol className="stages">{STAGES.map((s, i) => { const ok = canEnterStage(s.id, session); return (<li key={s.id} aria-current={stage === s.id ? 'step' : undefined} className={stage === s.id ? 'on' : ''}><button type="button" onClick={() => go(s.id)} disabled={!ok} title={!ok ? '먼저 준비 화면에서 후보를 확정해 주세요' : undefined}>{i + 1}. {s.label}</button></li>); })}</ol></nav>
        <div className="save" role="status">{saveState}</div>
      </header>
      {notice && <p className="notice" role="alert">{notice}</p>}
      <main tabIndex={-1} className="main">
        {stage === 'prep' && <Prep session={session} onChange={update} onStart={startSession} onImport={handleImport} />}
        {stage === 'visit' && <Visit session={session} onChange={update} onNext={() => go('summary')} onBack={() => go('prep')} />}
        {stage === 'summary' && <Summary session={session} stage={stage} onChange={update} onBack={() => go('visit')} onImport={handleImport} />}
      </main>
      <footer className="foot">
        <button type="button" className="ghost" onClick={clearAll}>내 기록 지우기</button>
        <span>기록은 이 기기에 저장됩니다. Muse에게 질문하기를 누르면 선택된 후보와 관찰 내용이 Meta로 전송됩니다. 주소 검색·지도를 사용하면 주소·좌표가 Kakao로 전송됩니다.</span>
        <details><summary>기술 세부 정보</summary><p className="hint">AI 연결 전에는 로컬 안내만 표시됩니다. 완료 표시는 모든 질문 해결과 별개이며 안전을 보장하지 않습니다. 전송 범위는 선택된 후보와 해당 관찰·메모로 제한됩니다.</p></details>
      </footer>
    </div>
  );
}
