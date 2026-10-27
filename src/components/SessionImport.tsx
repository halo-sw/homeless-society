import { hasWork, validateImport, type Session } from "../domain/session";
export default function SessionImport({ session, onImport, onMessage }: { session: Session; onImport: (s: Session) => void; onMessage: (m: string) => void }) {
  async function onFile(f: File) {
    if (f.size > 200 * 1024) { onMessage("Import failed: files must be 200KB or smaller."); return; }
    let text: string | null = null;
    try { text = await f.text(); } catch { onMessage("Could not read the file."); return; }
    const r = validateImport(text);
    if (!r.ok || !r.session) { onMessage("Import failed: " + r.error); return; }
    if (hasWork(session)) {
      if (!window.confirm("There are current notes. Replace them with the imported record?")) { onMessage("Import cancelled. Current notes are unchanged."); return; }
    }
    let stage: unknown;
    try {
      const raw = JSON.parse(text as string) as unknown;
      if (raw && typeof raw === "object") {
        const rec = raw as Record<string, unknown>;
        if (typeof rec.stage === "string") stage = rec.stage;
        else if (rec.session && typeof rec.session === "object" && typeof (rec as { stage?: unknown }).stage === "string") stage = (rec as { stage?: unknown }).stage;
      }
    } catch { }
    const imported = (stage !== undefined ? { ...r.session, stage } : r.session) as Session;
    onImport(imported);
    onMessage("Imported the record.");
  }
  return (
    <label className="file">Import record <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }} /></label>
  );
}
