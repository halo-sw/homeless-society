import { useEffect, useMemo, useRef, useState } from 'react';
import MapView from './MapView';
import MusePanel from './MusePanel';
import { DEMO_EVIDENCE, DEMO_NOTE } from '../data/demo';
import { LIMITS, STOPS, byteSize, isValidDateString, isValidHttpUrl, openQuestions, sourceTypeLabel, stopLabel, uid, type Session } from '../domain/session';
export default function Visit({ session, onChange, onNext, onBack }: { session: Session; onChange: (s: Session) => void; onNext: () => void; onBack: () => void }) {
  const [text, setText] = useState(''); const [question, setQuestion] = useState(''); const [url, setUrl] = useState(''); const [date, setDate] = useState('');
  const [formMsg, setFormMsg] = useState(''); const [editingId, setEditingId] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<null | { json: string }>(null);
  const cand = session.candidates.find((c) => c.id === session.activeCandidateId) ?? session.candidates[0];
  const stop = STOPS.find((s) => s.id === session.activeStopId) ?? STOPS[0];
  const ctxKey = cand ? cand.id + '|' + stop.id : '';
  const firstRef = useRef(true);
  const mirror = useRef({ text: '', question: '', url: '', date: '' });
  mirror.current = { text, question, url, date };
  useEffect(() => {
    if (firstRef.current) { firstRef.current = false; return; }
    const d = mirror.current;
    const had = d.text.trim() !== '' || d.question.trim() !== '' || d.url.trim() !== '' || d.date !== '';
    setText(''); setQuestion(''); setUrl(''); setDate(''); setEditingId(null); setDeleted(null);
    setFormMsg(had ? '다른 후보·지점으로 이동했습니다. 작성 중이던 입력 칸 내용은 지워졌습니다.' : '');
  }, [ctxKey]);
  const obs = useMemo(() => (cand ? session.observations.filter((o) => o.candidateId === cand.id && o.stopId === stop.id) : []), [session.observations, cand, stop.id]);
  const demoItems = session.mode === 'demo' && cand ? DEMO_EVIDENCE.filter((d) => d.home === cand.id && d.stop === stop.id) : [];
  const nextQs = cand ? openQuestions(session, cand.id, 3) : [];
  const progress = STOPS.filter((s) => cand && session.observations.some((o) => o.candidateId === cand.id && o.stopId === s.id)).length;
  if (!cand) return (<section aria-labelledby="visit-h"><h1 id="visit-h" tabIndex={-1}>세 곳을 둘러보고 적습니다</h1><p>준비 화면에서 먼저 주소를 정해주세요.</p><button type="button" onClick={onBack}>준비로</button></section>);
  function addOrSave() {
    const t = text.trim(); const q = question.trim(); const u = url.trim();
    if (!t) { setFormMsg('관찰 내용을 입력해 주세요.'); return; }
    if (t.length > 2000 || q.length > 2000) { setFormMsg('관찰·질문은 각각 2000자 이내로 적어 주세요.'); return; }
    if (!isValidHttpUrl(u)) { setFormMsg('출처 URL은 http(s)로 시작하고 로그인 정보를 포함하지 않아야 합니다.'); return; }
    const d = date ? date : null;
    if (!isValidDateString(d)) { setFormMsg('출처 날짜는 달력에서 선택해 주세요.'); return; }
    if (editingId) {
      const target = session.observations.find((o) => o.id === editingId);
      if (!target || target.candidateId !== cand.id || target.stopId !== stop.id) { setFormMsg('수정 중인 기록이 다른 후보·지점의 것입니다. 이동 전 화면에서 다시 수정해 주세요.'); setEditingId(null); return; }
      const next = { ...session, observations: session.observations.map((o) => (o.id === editingId ? { ...o, text: t, question: q, sourceUrl: u, sourceDate: d, updatedAt: new Date().toISOString() } : o)) };
      if (byteSize(next) > LIMITS.jsonBytes) { setFormMsg('기록 용량이 제한에 가까워 저장할 수 없습니다.'); return; }
      onChange(next);
      setEditingId(null); setFormMsg('수정 내용을 저장했습니다.');
    } else {
      if (session.observations.length >= LIMITS.observations) { setFormMsg('관찰 기록이 최대 개수에 도달했습니다.'); return; }
      const next = { ...session, observations: [...session.observations, { id: uid('ob'), candidateId: cand.id, stopId: stop.id, text: t, question: q, sourceType: 'user' as const, sourceUrl: u, sourceDate: d, resolved: false, updatedAt: new Date().toISOString() }] };
      if (byteSize(next) > LIMITS.jsonBytes) { setFormMsg('기록 용량이 제한에 가까워 더 추가할 수 없습니다.'); return; }
      onChange(next);
      setFormMsg('기록되었습니다.');
    }
    setText(''); setQuestion(''); setUrl(''); setDate('');
  }
  function remove(id: string) {
    const target = session.observations.find((o) => o.id === id);
    if (!target) return;
    if (!window.confirm('이 관찰 기록을 삭제할까요?')) return;
    setDeleted({ json: JSON.stringify(target) });
    onChange({ ...session, observations: session.observations.filter((o) => o.id !== id) });
    if (editingId === id) { setEditingId(null); setText(''); setQuestion(''); setUrl(''); setDate(''); }
    setFormMsg('삭제했습니다. 필요하면 되돌리기로 복원하세요.');
  }
  function undo() {
    if (!deleted) return;
    try {
      const o = JSON.parse(deleted.json) as Session['observations'][number];
      if (o.candidateId !== cand.id || o.stopId !== stop.id) { setFormMsg('다른 후보·지점의 기록이라 복원하지 않았습니다. 해당 화면에서 다시 시도해 주세요.'); return; }
      onChange({ ...session, observations: [...session.observations, o] }); setDeleted(null); setFormMsg('복원했습니다.');
    } catch { setFormMsg('복원에 실패했습니다.'); }
  }
  const recent = [...session.observations].filter((o) => o.candidateId === cand.id).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 3);
  return (
    <section aria-labelledby="visit-h">
      <h1 id="visit-h" tabIndex={-1} className="stage-title">세 곳을 둘러보고 적습니다 {session.mode === 'demo' ? <span className="badge">가상 예시</span> : <span className="badge live">내 주소</span>}</h1>
      {session.mode === 'demo' ? <p className="demo-banner">{DEMO_NOTE}</p> : <p className="demo-banner live-note">입력 주소와 직접 기록만 사용합니다. 도면은 실측 지리가 아닙니다.</p>}
      <div className="switcher">
        <div className="tabs" role="tablist" aria-label="후보 선택">{session.candidates.map((c) => (<button type="button" key={c.id} role="tab" aria-selected={c.id === cand.id} onClick={() => onChange({ ...session, activeCandidateId: c.id })}>{c.nickname}</button>))}</div>
        <p className="hint" role="status">진행 {progress}/{STOPS.length} 지점 · {cand.nickname} · {cand.address}</p>
      </div>
      <ol className="stops" aria-label="관찰 지점">{STOPS.map((s, i) => (<li key={s.id} className={s.id === stop.id ? 'on' : ''}><button type="button" onClick={() => onChange({ ...session, activeStopId: s.id })} aria-current={s.id === stop.id ? 'step' : undefined}><span className="num">{i + 1}</span> {s.label}<small>{s.topic}</small></button></li>))}</ol>
      <div className="workbench">
        <div className="mapbox"><MapView session={session} candidate={cand} stopId={stop.id} onSelectStop={(id) => onChange({ ...session, activeStopId: id })} /></div>
        <aside className="notebook" aria-label="관찰 노트">
          <h2>{cand.nickname} · {stop.label}</h2>
          <p className="hint">{stop.topic}</p>
          {demoItems.map((d) => (<article key={d.id} className="ev"><h3>{d.title} <span className="tag">가상 가정</span></h3><p>{d.body}</p><p className="meta">시점 미확인 · 보기만으로 검증되지 않음</p></article>))}
          {session.mode === 'live' && obs.length === 0 && <p className="hint">확인된 주변 정보가 없습니다. {stop.topic}을 직접 확인해 주세요. (추가 확인 필요)</p>}
          <h3>내 관찰 기록 ({obs.length})</h3>
          {obs.map((o) => (<article key={o.id} className="ev">
            <p>{o.text}</p>
            {o.question && <p>질문: {o.question} ({o.resolved ? '내 확인 완료(사용자 보고)' : '미해결'})</p>}
            <p className="meta">{sourceTypeLabel(o.sourceType)}{session.mode === 'demo' ? '·가상 예시에서 작성' : ''} · {cand.nickname}·{stopLabel(o.stopId)} · {o.sourceDate ?? '시점 미확인'}{o.sourceUrl && (<span> · <a href={o.sourceUrl} target="_blank" rel="noreferrer">출처 열기</a> <span className="url">{o.sourceUrl.slice(0, 80)}</span></span>)} · {o.updatedAt ? o.updatedAt.slice(0, 10) : '시점 미기록'}</p>
            <div className="row">
              <button type="button" onClick={() => onChange({ ...session, observations: session.observations.map((x) => (x.id === o.id ? { ...x, resolved: !x.resolved, updatedAt: new Date().toISOString() } : x)) })}>{o.resolved ? '미해결로' : '내 확인 완료로'}</button>
              <button type="button" onClick={() => { setEditingId(o.id); setText(o.text); setQuestion(o.question); setUrl(o.sourceUrl); setDate(o.sourceDate ?? ''); setFormMsg('수정 중입니다. 저장 전까지 다른 후보·지점으로 이동하면 입력 칸이 초기화됩니다.'); }}>수정</button>
              <button type="button" onClick={() => remove(o.id)}>삭제</button>
            </div>
          </article>))}
          {deleted && <div className="actions"><button type="button" onClick={undo}>삭제 되돌리기</button></div>}
          <h3>{editingId ? '관찰 수정' : '관찰 기록하기'}</h3>
          <label htmlFor="ob-text">관찰 내용</label><textarea id="ob-text" value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="본 것 그대로 적어요" />
          <label htmlFor="ob-q">남은 질문</label><input id="ob-q" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} placeholder="남은 질문 (선택)" />
          <label htmlFor="ob-url">출처 URL</label><input id="ob-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="출처 URL (선택, https://…)" inputMode="url" maxLength={500} />
          <label htmlFor="ob-date">출처 날짜(선택)</label><input id="ob-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="actions"><button type="button" className="primary" onClick={addOrSave}>{editingId ? '수정 저장' : '기록 추가'}</button></div>
          {formMsg && <p role="status" className="hint">{formMsg}</p>}
          <h3>다음 확인할 질문 Top 3 ({cand.nickname})</h3>
          <ul>{nextQs.map((o) => (<li key={o.id}>{o.question}</li>))}{nextQs.length === 0 && <li>열린 질문이 없습니다. 관찰을 추가하면 여기에 표시됩니다.</li>}</ul>
          {recent.length > 0 && <div><h3>최근 변경</h3><ul>{recent.map((o) => (<li key={o.id} className="meta">{o.updatedAt ? o.updatedAt.slice(0, 10) : '미기록'} · {o.text.slice(0, 30)}</li>))}</ul></div>}
          <MusePanel session={session} />
        </aside>
      </div>
      <div className="actions visit-nav"><button type="button" onClick={onBack}>준비로</button><button type="button" className="primary" onClick={onNext}>정리·비교로</button></div>
    </section>
  );
}
