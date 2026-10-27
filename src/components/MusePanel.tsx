import { useEffect, useMemo, useRef, useState } from 'react';
import { containsBannedClaim, stopLabel, type Session } from '../domain/session';
interface Q {
  text: string;
  reason: string;
  evidenceIds: string[];
}
interface StatusState {
  aiReady: boolean;
  note: string;
  extra?: string;
  model?: string;
}
export default function MusePanel({ session }: { session: Session }) {
  const [status, setStatus] = useState<StatusState>({ aiReady: false, note: '확인 중…' });
  const [qs, setQs] = useState<Q[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [modelName, setModelName] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);
  const mountedRef = useRef(true);
  const sig: string = useMemo(
    () =>
      JSON.stringify({
        a: session.activeCandidateId,
        s: session.activeStopId,
        o: session.observations.map((o) => ({ id: o.id, c: o.candidateId, s: o.stopId, t: o.text, q: o.question, r: o.resolved, u: o.updatedAt })),
        p: session.priorities,
        q: session.initialQuestions,
        m: (session.visitMemos ?? []).map((m) => ({ id: m.id, c: m.candidateId, t: m.text, d: m.date, u: m.updatedAt })),
        n: session.visitNotes,
      }),
    [session],
  );
  const sigRef = useRef<string>(sig);
  useEffect(() => {
    if (sigRef.current !== sig) {
      sigRef.current = sig;
      reqIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setQs([]);
      setMsg('맥락이 바뀌어 이전 제안을 지웠습니다. 필요하면 다시 요청해 주세요.');
      setBusy(false);
    }
  }, [sig]);
  useEffect(() => {
    let live = true;
    fetch('/api/muse/status')
      .then((r) => r.json())
      .then((j) => {
        if (live) {
          setStatus({
            aiReady: !!j.aiReady,
            note: String(j.note || 'AI 연결 전'),
            extra: '호출 ' + (j.calls ?? 0) + '회',
          });
        }
      })
      .catch(() => {
        if (live) setStatus({ aiReady: false, note: 'AI 연결 전' });
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);
  async function refreshStatus(): Promise<void> {
    try {
      const r = await fetch('/api/muse/status');
      const j = await r.json();
      if (!mountedRef.current) return;
      setStatus({
        aiReady: !!j.aiReady,
        note: String(j.note || 'AI 연결 전'),
        extra: '호출 ' + (j.calls ?? 0) + '회',
      });
    } catch {
    }
  }
  function cancel(): void {
    reqIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMsg('요청을 취소했습니다. 기록은 그대로 있습니다.');
  }
  async function ask(): Promise<void> {
    const active = session.candidates.find((c) => c.id === session.activeCandidateId) ?? session.candidates[0];
    if (!active) {
      setMsg('먼저 준비 화면에서 후보를 확정해 주세요.');
      return;
    }
    const atStart: string = sig;
    const myId: number = reqIdRef.current + 1;
    reqIdRef.current = myId;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer: number = window.setTimeout(() => ctrl.abort(), 120000);
    setBusy(true);
    setMsg('확인 질문을 요청 중…');
    try {
      const payload: Session = {
        ...session,
        candidates: [active],
        observations: session.observations.filter((o) => o.candidateId === active.id),
        visitNotes: '',
        visitMemos: (session.visitMemos ?? []).filter((m) => m.candidateId === active.id),
        changeLog: [],
        activeCandidateId: active.id,
      };
      const r = await fetch('/api/muse/questions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session: payload }),
        signal: ctrl.signal,
      });
      const j = await r.json().catch(() => ({}));
      window.clearTimeout(timer);
      if (!mountedRef.current) return;
      if (reqIdRef.current !== myId || sigRef.current !== atStart) {
        return;
      }
      if (!r.ok) {
        setMsg('Muse 요청 실패: ' + ((j as { error?: string }).error || '알 수 없는 오류') + '. 기록은 그대로 있습니다. 다시 시도해 주세요.');
      } else {
        const rawList: unknown = (j as { questions?: unknown }).questions;
        const list: Q[] = Array.isArray(rawList)
          ? (rawList as Q[]).filter(
              (q: Q) =>
                q &&
                typeof q.text === 'string' &&
                !containsBannedClaim(q.text) &&
                !containsBannedClaim(q.reason || ''),
            )
          : [];
        const verifiedModel: string = typeof (j as { model?: unknown }).model === 'string' ? String((j as { model?: string }).model) : '';
        const isMock: boolean = !!(j as { mock?: boolean }).mock;
        if (!mountedRef.current || reqIdRef.current !== myId || sigRef.current !== atStart) return;
        setModelName(verifiedModel);
        if (list.length === 0) {
          setQs([]);
          setMsg(
            verifiedModel
              ? '사용 가능한 질문을 받지 못했습니다(' + verifiedModel + '). 기록은 그대로 있습니다. 다시 시도해 주세요.'
              : '사용 가능한 질문을 받지 못했습니다. 기록은 그대로 있습니다. 다시 시도해 주세요.',
          );
          await refreshStatus();
        } else {
          setQs(list.slice(0, 5));
          setMsg(
            isMock
              ? '기본 확인 질문 · AI 연결 전 (로컬 안내)'
              : 'Muse(' + (verifiedModel || 'muse-spark-1.3') + ') 확인 질문',
          );
          await refreshStatus();
          if (!mountedRef.current || reqIdRef.current !== myId || sigRef.current !== atStart) return;
          if (!isMock && verifiedModel) {
            setStatus((prev) => ({ ...prev, aiReady: true, note: 'Muse 응답 확인됨', model: verifiedModel }));
          }
        }
      }
    } catch {
      window.clearTimeout(timer);
      if (!mountedRef.current) return;
      if (reqIdRef.current !== myId) return;
      setMsg(
        ctrl.signal.aborted
          ? '요청이 취소되었거나 시간이 초과되었습니다. 기록은 그대로 있습니다.'
          : '네트워크 오류입니다. 기록은 그대로 있습니다. 다시 시도해 주세요.',
      );
    }
    if (mountedRef.current && reqIdRef.current === myId) {
      setBusy(false);
    }
  }
  function evidenceLabel(id: string): string {
    const o = session.observations.find((x) => x.id === id);
    if (!o) return '알 수 없는 근거';
    const cn: string = session.candidates.find((c) => c.id === o.candidateId)?.nickname ?? '후보';
    return cn + '·' + stopLabel(o.stopId) + ': ' + o.text.slice(0, 40);
  }
  return (
    <section aria-label="Muse 확인 질문" className="muse">
      <h4>Muse 확인 질문</h4>
      {!status.aiReady && (
        <p className="hint">
          AI 연결 전: {status.note}. 로컬 안내로 계속할 수 있습니다.
        </p>
      )}
      {status.aiReady && (
        <p className="hint">
          상태: {status.note} · {status.extra ?? ''}
          {modelName ? ' · 모델: ' + modelName : ''}
        </p>
      )}
      <div className="actions">
        <button className="primary" onClick={ask} disabled={busy}>
          {busy ? '요청 중…' : 'Muse에게 다음 확인 질문 받기'}
        </button>
        {busy && <button onClick={cancel}>취소</button>}
      </div>
      {msg && <p role="status">{msg}</p>}
      <ul>
        {qs.map((q, i) => (
          <li key={i}>
            {q.text} <span className="meta">({q.reason || '확인용 질문'}) [근거: {(q.evidenceIds || []).map((id) => evidenceLabel(id)).join(' / ') || '없음'}]</span>
          </li>
        ))}
      </ul>
      <details>
        <summary>연결 세부 정보</summary>
        <p className="hint">
          모델: muse-spark-1.3 · 상태: {status.note} · {status.extra ?? ''} · 요청 제한 120초 · 전송 범위: 선택된 후보와 해당 후보의 관찰·방문메모만. 전역 메모는 전송하지 않습니다. 기술 안내는 여기에서만 확인하세요.
        </p>
      </details>
    </section>
  );
}
