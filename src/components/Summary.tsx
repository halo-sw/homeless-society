import { useState } from 'react';
import { LIMITS, STOPS, changedSincePrep, isValidDateString, missingStopsFor, openQuestions, sourceTypeLabel, stopLabel, summarize, uid, type Session, type StageId } from '../domain/session';
import SessionImport from './SessionImport';
export default function Summary({ session, stage, onChange, onBack, onImport }: { session: Session; stage: StageId; onChange: (s: Session) => void; onBack: () => void; onImport: (s: Session) => void }) {
  const [msg, setMsg] = useState('');
  const [memoText, setMemoText] = useState<Record<string, string>>({});
  const [memoDate, setMemoDate] = useState<Record<string, string>>({});
  const sum = summarize(session);
  const memos = session.visitMemos ?? [];
  const allOpen = openQuestions(session, undefined, 20);
  function download() {
    try {
      const payload = { ...session, stage };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'homeless-society-session.json'; document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg('기록 JSON을 저장했습니다.');
    } catch { setMsg('저장에 실패했습니다.'); }
  }
  function downloadChecklist() {
    try {
      const lines: string[] = ['방문 체크리스트', ''];
      for (const c of session.candidates) {
        lines.push('[' + c.nickname + '] ' + c.address);
        const missing = missingStopsFor(session, c.id);
        for (const m of missing) lines.push('- 미관찰: ' + m.label + ' (' + m.topic + ')');
        const mine = allOpen.filter((o) => o.candidateId === c.id);
        for (const o of mine) lines.push('- 질문: ' + o.question + ' (' + stopLabel(o.stopId) + ')');
      }
      for (const t of sum.askVisit) lines.push('- ' + t);
      lines.push('', '우선순위: ' + (session.priorities.join(', ') || '미선택'));
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'visit-checklist.txt'; document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg('방문 체크리스트를 저장했습니다.');
    } catch { setMsg('저장에 실패했습니다.'); }
  }
  function saveMemo(candidateId: string) {
    const existing = memos.find((m) => m.candidateId === candidateId);
    const rawText = memoText[candidateId] !== undefined ? memoText[candidateId] : (existing?.text ?? '');
    const t = rawText.trim();
    const d = memoDate[candidateId] ?? existing?.date ?? '';
    if (!t) { setMsg('방문 메모를 입력해 주세요.'); return; }
    if (t.length > 2000) { setMsg('방문 메모는 2000자 이내로 적어 주세요.'); return; }
    if (d && !isValidDateString(d)) { setMsg('방문 날짜를 달력에서 선택해 주세요.'); return; }
    const list = [...memos]; const ix = list.findIndex((m) => m.candidateId === candidateId);
    const row = { id: ix >= 0 ? list[ix].id : uid('memo'), candidateId, text: t, date: d || null, updatedAt: new Date().toISOString() };
    if (ix >= 0) list[ix] = row; else list.push(row);
    onChange({ ...session, visitMemos: list.slice(-LIMITS.memos) });
    setMemoText((p) => { const n = { ...p }; delete n[candidateId]; return n; });
    setMemoDate((p) => { const n = { ...p }; delete n[candidateId]; return n; });
    setMsg('방문 메모를 저장했습니다.');
  }
  function deleteMemo(candidateId: string) {
    const existing = memos.find((m) => m.candidateId === candidateId);
    if (!existing) return;
    if (!window.confirm('이 방문 메모를 삭제할까요?')) return;
    onChange({ ...session, visitMemos: memos.filter((m) => m.candidateId !== candidateId) });
    setMemoText((p) => { const n = { ...p }; delete n[candidateId]; return n; });
    setMemoDate((p) => { const n = { ...p }; delete n[candidateId]; return n; });
    setMsg('방문 메모를 삭제했습니다.');
  }
  void STOPS;
  return (
    <section aria-labelledby="sum-h">
      <h1 id="sum-h" tabIndex={-1} className="stage-title">두 집을 나란히 놓고 봅니다 {session.mode === 'demo' ? <span className="badge">가상 예시</span> : <span className="badge live">내 주소</span>}</h1>
      <div className={session.candidates.length <= 1 ? 'compare single' : 'compare'}>
        {session.candidates.map((c) => {
          const list = session.observations.filter((o) => o.candidateId === c.id);
          const memo = memos.find((m) => m.candidateId === c.id);
          const missing = missingStopsFor(session, c.id);
          return (
            <article key={c.id} aria-label={c.nickname + ' 비교'}>
              <h2>{c.nickname}</h2>
              <p className="meta">{c.address} · {c.source === 'demo' ? '가상 예시' : '사용자 확인'} · {c.coords ? (c.coords.verified ? '주소 검색결과' : '직접 입력(미검증)') : '좌표 없음'}</p>
              {missing.length > 0 && <p className="hint">미관찰({c.nickname}): {missing.map((m) => m.label).join(', ')}</p>}
              {list.length === 0 && <p className="hint">기록 없음. 미확인이 문제없음은 아닙니다.</p>}
              <ul>{list.map((o) => (<li key={o.id}>{o.text} ({o.resolved ? '내 확인 완료(사용자 보고)' : '미해결'}){o.question && o.question.trim() ? ' 질문: ' + o.question.trim() + ' (' + (o.resolved ? '내 확인 완료(사용자 보고)' : '미해결') + ')' : ''} <span className="meta">· {c.nickname}·{stopLabel(o.stopId)}·{sourceTypeLabel(o.sourceType)} · {o.sourceDate ?? '시점 미확인'}{o.sourceUrl && (<span> · <a href={o.sourceUrl} target="_blank" rel="noreferrer">출처</a></span>)}</span></li>))}</ul>
              {memo && <p className="meta">방문 메모({memo.date ?? '날짜 미기록'}): {memo.text}</p>}
            </article>
          );
        })}
        {session.candidates.length === 0 && <p>아직 확정된 후보가 없습니다.</p>}
      </div>
      <div className="cols3">
        <div><h2>관찰한 것</h2><ul>{session.observations.map((o) => { const cn = session.candidates.find((c) => c.id === o.candidateId)?.nickname ?? '후보'; return (<li key={o.id}>{o.text} <span className="meta">({cn}·{stopLabel(o.stopId)}·{sourceTypeLabel(o.sourceType)}{o.resolved ? '·확인 완료(사용자 보고)' : '·미해결'})</span></li>); })}{session.observations.length === 0 && <li>아직 관찰 기록이 없습니다.</li>}</ul></div>
        <div><h2>아직 모르는 것</h2><ul>{sum.open.map((t, i) => (<li key={i}>{t}</li>))}{session.candidates.flatMap((c) => missingStopsFor(session, c.id).map((s) => ({ c, s }))).map(({ c, s }) => (<li key={c.id + s.id}>{c.nickname} {s.label} 미관찰: {s.topic}</li>))}<li>밤 시간대·실내는 미확인입니다.</li></ul></div>
        <div><h2>방문 체크리스트</h2><ol>{sum.askVisit.map((t, i) => (<li key={i}>{t}</li>))}<li>우선순위({session.priorities.join(', ') || '미선택'})와 열린 질문을 함께 확인하세요.</li></ol></div>
      </div>
      <h2>준비 이후 변화</h2>
      <ul>{changedSincePrep(session).map((t, i) => (<li key={i}>{t}</li>))}{changedSincePrep(session).length === 0 && <li>아직 변화가 없습니다.</li>}</ul>
      <h2>처음 관심과 질문</h2>
      <p className="meta">관심사: {session.priorities.join(', ') || '없음'} · 공통 초기 질문: {session.initialQuestions || '없음'}</p>
      {allOpen.length > 0 && <ul>{allOpen.slice(0, 5).map((o) => { const cn = session.candidates.find((c) => c.id === o.candidateId)?.nickname ?? '후보'; return (<li key={o.id} className="meta">{cn}·{stopLabel(o.stopId)}: {o.question}</li>); })}</ul>}
      <h2>후보별 방문 메모 (날짜 포함, 명시적 저장)</h2>
      {session.candidates.map((c) => (
        <div key={c.id} className="memo">
          <h3>{c.nickname}</h3>
          <label htmlFor={'memo-' + c.id}>방문 메모</label>
          <textarea id={'memo-' + c.id} rows={2} maxLength={2000} value={memoText[c.id] ?? memos.find((m) => m.candidateId === c.id)?.text ?? ''} onChange={(e) => setMemoText({ ...memoText, [c.id]: e.target.value })} placeholder="방문 후 본 것을 적어요" />
          <label htmlFor={'date-' + c.id}>방문 날짜</label>
          <input id={'date-' + c.id} type="date" value={memoDate[c.id] ?? memos.find((m) => m.candidateId === c.id)?.date ?? ''} onChange={(e) => setMemoDate({ ...memoDate, [c.id]: e.target.value })} />
          <div className="actions"><button type="button" className="primary" onClick={() => saveMemo(c.id)}>메모 저장</button>{memos.some((m) => m.candidateId === c.id) && <button type="button" className="ghost" onClick={() => deleteMemo(c.id)}>메모 삭제</button>}</div>
        </div>
      ))}
      <label className="check"><input type="checkbox" checked={session.complete} onChange={(e) => onChange({ ...session, complete: e.target.checked })} /> 세션 완료로 표시 (모든 질문 해결과는 별개이며 안전을 보장하지 않음)</label>
      <div className="actions">
        <button type="button" onClick={onBack}>임장으로 돌아가기</button>
        <button type="button" onClick={() => window.print()}>방문 시트 인쇄</button>
        <button type="button" onClick={download}>기록 JSON 저장</button>
        <button type="button" onClick={downloadChecklist}>방문 체크리스트 저장</button>
        <SessionImport session={session} onImport={onImport} onMessage={setMsg} />
      </div>
      {msg && <p role="status">{msg}</p>}
    </section>
  );
}
