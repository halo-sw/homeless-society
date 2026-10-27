import { stopLabel, type Session } from "../domain/session";
export function isPublicDemo(): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    return env?.VITE_PUBLIC_DEMO === "true";
  } catch {
    return false;
  }
}
export interface GuideQuestion { text: string; reason: string; evidenceIds: string[] }
export function localFieldGuide(session: Session): { questions: GuideQuestion[]; model: string } {
  const active = session.candidates.find((c) => c.id === session.activeCandidateId) ?? session.candidates[0];
  const stop = stopLabel(session.activeStopId as never);
  const who = active ? active.nickname : "this home";
  const base: GuideQuestion[] = [
    { text: "What would you check at " + who + " (" + stop + ") after 9pm?", reason: "Local field guide: evening gap with no verified evidence", evidenceIds: [] },
    { text: "Where does the " + stop.toLowerCase() + " route feel narrow near " + who + "?", reason: "Local field guide: walk-through prompt", evidenceIds: [] },
    { text: "What remains unanswered before a second visit to " + who + "?", reason: "Local field guide: open-question prompt", evidenceIds: [] }
  ];
  const mine = active ? session.observations.filter((o) => o.candidateId === active.id) : [];
  if (mine.length === 0) return { questions: base.slice(0, 1), model: "local-template" };
  return { questions: base.slice(0, 3), model: "local-template" };
}
export async function fetchMuseStatus(): Promise<{ aiReady: boolean; note: string; calls?: number; cap?: number }> {
  if (isPublicDemo()) {
    return { aiReady: false, note: "Field guide only · no live AI call", calls: 0, cap: 0 };
  }
  const r = await fetch("/api/muse/status");
  return (await r.json()) as { aiReady: boolean; note: string; calls?: number; cap?: number };
}
export async function requestMuseQuestions(session: Session, signal: AbortSignal): Promise<{ questions: GuideQuestion[]; mock: boolean; model: string }> {
  if (isPublicDemo()) {
    const g = localFieldGuide(session);
    return { questions: g.questions, mock: true, model: "local-template" };
  }
  const active = session.candidates.find((c) => c.id === session.activeCandidateId) ?? session.candidates[0];
  const payload = {
    version: 1 as const,
    mode: session.mode,
    candidates: active ? [{ id: active.id, nickname: active.nickname, address: active.address, source: active.source, coords: active.coords, confirmed: active.confirmed }] : [],
    observations: active ? session.observations.filter((o) => o.candidateId === active.id).slice(0, 60) : [],
    visitNotes: "",
    visitMemos: (session.visitMemos ?? []).filter((m) => active && m.candidateId === active.id).slice(0, 5),
    changeLog: [],
    activeCandidateId: active ? active.id : "",
    activeStopId: session.activeStopId,
    priorities: session.priorities,
    initialQuestions: session.initialQuestions
  };
  const r = await fetch("/api/muse/questions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: payload }), signal });
  const j = (await r.json().catch(() => ({}))) as { questions?: GuideQuestion[]; mock?: boolean; model?: string; error?: string };
  if (!r.ok) throw new Error(j.error || "Muse request failed");
  return { questions: Array.isArray(j.questions) ? j.questions : [], mock: !!j.mock, model: typeof j.model === "string" ? j.model : "" };
}
