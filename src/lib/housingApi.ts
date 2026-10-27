export interface RegionHit { lawd_cd: string; name: string }
export interface TradesResponse {
  items: { name: string; district: string; area_m2: number; floor: number; price_10k: number; deal_date: string; build_year: number | null; deal_type: string }[];
  summary: { median_price_10k: number | null; min_price_10k: number | null; max_price_10k: number | null; sample_count: number };
  query: { asset_type: string; lawd_cd: string; deal_ymd: string };
  source: string;
  units: string;
}
export async function searchRegions(q: string): Promise<{ results: RegionHit[] }> {
  const query = q.trim();
  if (!query || query.length > 30) throw new Error("Enter 1–30 characters.");
  const r = await fetch("/api/housing?kind=regions&q=" + encodeURIComponent(query));
  const j = (await r.json().catch(() => ({}))) as { results?: RegionHit[]; error?: string };
  if (!r.ok) throw new Error(j.error || "Region search failed");
  return { results: Array.isArray(j.results) ? j.results : [] };
}
export async function fetchTrades(lawd_cd: string, deal_ymd: string, asset: string): Promise<TradesResponse> {
  if (!/^\d{5}$/.test(lawd_cd)) throw new Error("Pick a verified district first.");
  if (!/^\d{6}$/.test(deal_ymd)) throw new Error("Pick a valid month.");
  const r = await fetch("/api/housing?kind=trades&lawd_cd=" + encodeURIComponent(lawd_cd) + "&deal_ymd=" + encodeURIComponent(deal_ymd) + "&asset=" + encodeURIComponent(asset));
  const j = (await r.json().catch(() => ({}))) as TradesResponse & { error?: string };
  if (!r.ok) throw new Error(j.error || "Trade request failed");
  return j as TradesResponse;
}
