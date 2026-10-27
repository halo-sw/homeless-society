export const KSKILL_BASE = "https://k-skill-proxy.nomadamas.org";
export const ALLOWED_ASSETS = ["apartment", "officetel", "villa", "single-house"] as const;
export const TRADE_PATH: Record<string, string> = {
  apartment: "/v1/real-estate/apartment/trade",
  officetel: "/v1/real-estate/officetel/trade",
  villa: "/v1/real-estate/villa/trade",
  "single-house": "/v1/real-estate/single-house/trade"
};
export interface HousingResult { status: number; body: unknown; cacheable: boolean }
function err(status: number, error: string): HousingResult {
  return { status, body: { error }, cacheable: false };
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function validDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
async function fetchBoundedText(fetchFn: typeof fetch, url: string): Promise<{ res: Response; text: string }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const res = await fetchFn(url, { method: "GET", redirect: "error", signal: ctl.signal });
    const body = res.body;
    if (!body) {
      const text = await res.text();
      if (Buffer.byteLength(text, "utf8") > 1024 * 1024) throw new Error("too large");
      return { res, text };
    }
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        size += value.byteLength;
        if (size > 1024 * 1024) { try { await reader.cancel(); } catch {} throw new Error("too large"); }
        chunks.push(value);
      }
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return { res, text: buf.toString("utf8") };
  } finally { clearTimeout(t); }
}
function rejectUnknown(params: Record<string, string | undefined>, allowed: string[]): string | null {
  for (const k of Object.keys(params)) { if (!allowed.includes(k) && params[k] !== undefined) return k; }
  return null;
}
function queryMetaMismatch(j: unknown, expected: { lawd_cd?: string; deal_ymd?: string; asset?: string }): boolean {
  if (!isRecord(j)) return false;
  const cands: unknown[] = [j.query, j.meta, j.request];
  if (typeof j.lawd_cd === "string" || typeof j.deal_ymd === "string" || typeof j.asset_type === "string" || typeof j.asset === "string") cands.push(j);
  for (const c of cands) {
    if (!isRecord(c)) continue;
    if (typeof c.lawd_cd === "string" && expected.lawd_cd && c.lawd_cd !== expected.lawd_cd) return true;
    if (typeof c.deal_ymd === "string" && expected.deal_ymd && c.deal_ymd !== expected.deal_ymd) return true;
    const a = typeof c.asset_type === "string" ? c.asset_type : typeof c.asset === "string" ? c.asset : undefined;
    if (typeof a === "string" && expected.asset && a !== expected.asset) return true;
  }
  return false;
}
export async function handleHousingQuery(params: Record<string, string | undefined>, fetchFn: typeof fetch = fetch): Promise<HousingResult> {
  const kind = params.kind;
  if (kind !== "regions" && kind !== "trades") return err(400, "kind must be regions or trades.");
  if (kind === "regions") {
    const bad = rejectUnknown(params, ["kind", "q"]);
    if (bad) return err(400, "Unknown query parameter: " + bad + ".");
    const q = (params.q ?? "").trim();
    if (!q || q.length > 30) return err(400, "q must be 1–30 characters.");
    const upstream = KSKILL_BASE + "/v1/real-estate/region-code?q=" + encodeURIComponent(q);
    let r: Response; let text: string;
    try {
      const out = await fetchBoundedText(fetchFn, upstream);
      r = out.res; text = out.text;
    } catch { return err(502, "Region lookup failed. Please retry."); }
    if (!r.ok) return err(502, "Region lookup failed. Please retry.");
    let j: unknown;
    try { j = JSON.parse(text); } catch { return err(502, "Upstream returned invalid JSON."); }
    if (!isRecord(j) || !Array.isArray(j.results)) return err(502, "Upstream returned an unexpected shape.");
    const results: { lawd_cd: string; name: string }[] = [];
    for (const it of (j.results as unknown[]).slice(0, 20)) {
      if (!isRecord(it)) continue;
      const code = it.lawd_cd; const name = it.name;
      if (typeof code !== "string" || !/^\d{5}$/.test(code)) continue;
      if (typeof name !== "string" || !name.trim() || name.length > 120) continue;
      results.push({ lawd_cd: code, name: name.trim() });
    }
    return { status: 200, body: { results, query: q, units: "none", source: "k-skill proxy (region codes)", proxy: "k-skill-proxy" }, cacheable: true };
  }
  const badTrades = rejectUnknown(params, ["kind", "lawd_cd", "deal_ymd", "asset", "num_of_rows"]);
  if (badTrades) return err(400, "Unknown query parameter: " + badTrades + ".");
  const lawd_cd = (params.lawd_cd ?? "").trim();
  const deal_ymd = (params.deal_ymd ?? "").trim();
  const asset = (params.asset ?? "apartment").trim();
  const rowsRaw = (params.num_of_rows ?? "100").trim();
  if (!/^\d{5}$/.test(lawd_cd)) return err(400, "lawd_cd must be 5 digits.");
  if (!/^\d{6}$/.test(deal_ymd)) return err(400, "deal_ymd must be YYYYMM.");
  const mm = Number(deal_ymd.slice(4, 6));
  const yy = Number(deal_ymd.slice(0, 4));
  if (mm < 1 || mm > 12 || yy < 2006 || yy > 2035) return err(400, "deal_ymd is out of range.");
  if (!(ALLOWED_ASSETS as readonly string[]).includes(asset)) return err(400, "asset is not supported.");
  if (!/^\d{1,3}$/.test(rowsRaw)) return err(400, "num_of_rows must be 1–100.");
  const rows = Number(rowsRaw);
  if (!Number.isInteger(rows) || rows < 1 || rows > 100) return err(400, "num_of_rows must be 1–100.");
  const path = TRADE_PATH[asset];
  if (!path) return err(400, "asset is not yet integrated.");
  const upstream = KSKILL_BASE + path + "?lawd_cd=" + encodeURIComponent(lawd_cd) + "&deal_ymd=" + encodeURIComponent(deal_ymd) + "&num_of_rows=" + String(rows);
  let r: Response; let text: string;
  try {
    const out = await fetchBoundedText(fetchFn, upstream);
    r = out.res; text = out.text;
  } catch { return err(502, "Trade lookup failed. Please retry."); }
  if (!r.ok) {
    if (r.status === 404) return err(502, "This asset type is not yet integrated. Try apartment sales.");
    return err(502, "Trade lookup failed. Please retry.");
  }
  let j: unknown;
  try { j = JSON.parse(text); } catch { return err(502, "Upstream returned invalid JSON."); }
  if (!isRecord(j) || !Array.isArray((j as Record<string, unknown>).items)) return err(502, "Upstream returned an unexpected shape.");
  if (queryMetaMismatch(j, { lawd_cd, deal_ymd, asset })) return err(502, "Upstream returned mismatched query metadata.");
  const rawItems = (j as { items: unknown[] }).items.slice(0, 100);
  const items: { name: string; district: string; area_m2: number; floor: number; price_10k: number; deal_date: string; build_year: number | null; deal_type: string }[] = [];
  for (const it of rawItems) {
    if (!isRecord(it)) continue;
    const name = it.name; const district = it.district; const area = it.area_m2; const floor = it.floor; const price = it.price_10k; const date = it.deal_date; const by = it.build_year ?? null; const dt = it.deal_type;
    if (typeof name !== "string" || !name.trim() || name.length > 120) continue;
    if (typeof district !== "string" || district.length > 60) continue;
    if (typeof area !== "number" || !Number.isFinite(area) || area < 1 || area > 1000) continue;
    if (typeof floor !== "number" || !Number.isFinite(floor) || floor < -5 || floor > 100) continue;
    if (typeof price !== "number" || !Number.isFinite(price) || price < 10 || price > 10000000) continue;
    if (!validDate(date)) continue;
    if (by !== null && (typeof by !== "number" || !Number.isInteger(by) || by < 1900 || by > 2035)) continue;
    if (typeof dt !== "string" || dt.length > 40) continue;
    const ym = String(date).slice(0, 4) + String(date).slice(5, 7);
    if (ym !== deal_ymd) continue;
    items.push({ name: name.trim(), district: district.trim(), area_m2: area, floor, price_10k: price, deal_date: date, build_year: by, deal_type: dt });
    if (items.length >= 100) break;
  }
  const prices = items.map((i) => i.price_10k).sort((a, b) => a - b);
  if (rawItems.length > 0 && items.length === 0) return err(502, "Upstream returned no usable rows.");
  let mid: number | null = null;
  if (prices.length) {
    const n = prices.length;
    mid = n % 2 === 1 ? prices[Math.floor(n / 2)] : (prices[n / 2 - 1] + prices[n / 2]) / 2;
  }
  return {
    status: 200,
    body: {
      items,
      summary: { median_price_10k: mid, min_price_10k: prices.length ? prices[0] : null, max_price_10k: prices.length ? prices[prices.length - 1] : null, sample_count: prices.length },
      query: { asset_type: asset, lawd_cd, deal_ymd },
      units: "Prices are in 10,000 KRW units. 85500 means KRW 855,000,000.",
      source: "MOLIT real-transaction reports via k-skill proxy; past sales sample, not listings or a forecast.",
      proxy: "k-skill-proxy"
    },
    cacheable: true
  };
}
