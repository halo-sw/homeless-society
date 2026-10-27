import { hasWork, validateImport, type Session } from '../domain/session';
export default function SessionImport({ session, onImport, onMessage }: { session: Session; onImport: (s: Session) => void; onMessage: (m: string) => void }) {
  async function onFile(f: File) {
    if (f.size > 200 * 1024) { onMessage('가져오기 실패: 파일이 너무 큽니다(200KB 이하만 가능).'); return; }
    let text: string | null = null;
    try { text = await f.text(); } catch { onMessage('파일을 읽지 못했습니다.'); return; }
    const r = validateImport(text);
    if (!r.ok || !r.session) { onMessage('가져오기 실패: ' + r.error); return; }
    if (hasWork(session)) {
      if (!window.confirm('현재 기록이 있습니다. 가져온 기록으로 교체할까요?')) { onMessage('가져오기를 취소했습니다. 현재 기록은 그대로 있습니다.'); return; }
    }
    let stage: unknown;
    try {
      const raw = JSON.parse(text as string) as unknown;
      if (raw && typeof raw === 'object') {
        const rec = raw as Record<string, unknown>;
        if (typeof rec.stage === 'string') stage = rec.stage;
        else if (rec.session && typeof rec.session === 'object' && typeof (rec as { stage?: unknown }).stage === 'string') stage = (rec as { stage?: unknown }).stage;
      }
    } catch { /* keep validated session without stage */ }
    const imported = (stage !== undefined ? { ...r.session, stage } : r.session) as Session;
    onImport(imported);
    onMessage('기록을 가져왔습니다.');
  }
  return (
    <label className="file">기록 가져오기 <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} /></label>
  );
}
