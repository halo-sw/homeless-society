import { handleHousingQuery } from "../server/housing.js";
interface Req { method?: string; query: Record<string, string | string[]> }
interface Res { status: (n: number) => Res; json: (o: unknown) => void; setHeader: (k: string, v: string) => void }
export default async function handler(req: Req, res: Res): Promise<void> {
  if ((req.method ?? "GET") !== "GET") {
    res.status(405).json({ error: "Only GET is allowed." });
    return;
  }
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.query ?? {})) flat[k] = Array.isArray(v) ? v[0] : v;
  const out = await handleHousingQuery(flat);
  if (out.cacheable) res.setHeader("Cache-Control", "public, s-maxage=300, max-age=60");
  else res.setHeader("Cache-Control", "no-store");
  res.status(out.status).json(out.body);
}
