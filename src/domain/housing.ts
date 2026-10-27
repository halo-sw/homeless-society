export const KSKILL_PROXY = "https://k-skill-proxy.nomadamas.org";
export const MOLIT_URL = "https://rt.molit.go.kr/pt/xls/xls.do";
export const ASSETS = ["apartment", "officetel", "villa", "single-house"] as const;
export type Asset = (typeof ASSETS)[number];
export function defaultDealMonth(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = new Date(y, m - 1, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return String(yy) + mm;
}
export function monthInputToDealYmd(v: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const mm = Number(m[2]);
  if (mm < 1 || mm > 12) return null;
  return m[1] + m[2];
}
export function dealYmdToMonthInput(ymd: string): string {
  if (!/^\d{6}$/.test(ymd)) return "";
  return ymd.slice(0, 4) + "-" + ymd.slice(4, 6);
}
export function formatKrw(price10k: number): string {
  return "KRW " + Math.round(price10k * 10000).toLocaleString("en-US");
}
export function formatMillionKrw(price10k: number): string {
  return (price10k / 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + " million KRW";
}
export function price10kToMillion(price10k: number): number {
  return price10k / 100;
}
export function monthlyPaymentM(loanM: number, annualRatePct: number, termYears: number): number {
  if (!Number.isFinite(loanM) || !Number.isFinite(annualRatePct) || !Number.isFinite(termYears)) return 0;
  if (loanM <= 0 || termYears <= 0) return 0;
  const n = Math.round(termYears * 12);
  if (n <= 0) return 0;
  if (annualRatePct <= 0) return loanM / n;
  const r = annualRatePct / 100 / 12;
  const f = Math.pow(1 + r, n);
  return (loanM * r * f) / (f - 1);
}
export function commuteHoursPerMonth(oneWayMin: number, workdays: number): number {
  if (oneWayMin <= 0 || workdays <= 0) return 0;
  return (oneWayMin * 2 * workdays) / 60;
}
export function savedHoursPerMonth(improveMin: number, workdays: number, active: boolean): number {
  if (!active || improveMin <= 0 || workdays <= 0) return 0;
  return (improveMin * 2 * workdays) / 60;
}
export function priceCurve(priceM: number, growthPct: number, years: number): number[] {
  const out: number[] = [];
  for (let t = 0; t <= years; t += 1) out.push(priceM * Math.pow(1 + growthPct / 100, t));
  return out;
}
export const FACTOR_META: { id: string; label: string; hint: string }[] = [
  { id: "commute", label: "Commute and job access", hint: "Door-to-door time on a normal weekday." },
  { id: "transit", label: "Public transport and last mile", hint: "Stop distance, frequency, night service, slope." },
  { id: "schools", label: "Schools, catchment and childcare", hint: "Catchment rules change; verify with the school." },
  { id: "groceries", label: "Groceries, food and healthcare", hint: "Daily errands within walking distance." },
  { id: "parks", label: "Parks and leisure", hint: "Evening walk options and rest space." },
  { id: "noise", label: "Noise, daylight, air and flood", hint: "Visit at different hours; check flood history." },
  { id: "terrain", label: "Terrain, accessibility and parking", hint: "Slope, steps, lift, parking pressure." },
  { id: "building", label: "Building age, upkeep, layout", hint: "Year, management, orientation, layout." },
  { id: "cost", label: "Total purchase, upkeep and financing", hint: "Price, fees, taxes, maintenance, loan." },
  { id: "title", label: "Title, claims, tenant and deposit", hint: "Registry, claims, tenant and deposit checks." },
  { id: "community", label: "Local news and community", hint: "Manual sources only; no social scraping." },
  { id: "development", label: "Development, supply and population", hint: "Illustrative only; not a price forecast." }
];
export const PROFILES: Record<string, { label: string; weights: Record<string, number> }> = {
  commuter: { label: "Commuter", weights: { commute: 3, transit: 3, groceries: 2, cost: 2, noise: 1 } },
  family: { label: "Family", weights: { schools: 3, parks: 2, groceries: 2, terrain: 2, building: 2, cost: 2 } },
  firsthome: { label: "First home", weights: { cost: 3, title: 3, building: 2, commute: 2, development: 1 } }
};
