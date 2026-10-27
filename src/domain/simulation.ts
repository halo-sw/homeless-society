export const HOUR_MIN = 6;
export const HOUR_MAX = 23;
export const TRAFFIC_MIN = 0;
export const TRAFFIC_MAX = 2;
export const CAM_ANGLE_MIN = -45;
export const CAM_ANGLE_MAX = 45;
export const CAM_ZOOM_MIN = 0.5;
export const CAM_ZOOM_MAX = 1.6;
export const WALK_MIN = 0;
export const WALK_MAX = 3;
export const WORLD_SCALE = 4;
export const FICTION_LABEL = "Fictional scenario · not real-world measurements";
export interface SimState {
  hour: number;
  streetLights: boolean;
  showRoute: boolean;
  traffic: number;
  camAngle: number;
  camZoom: number;
  walkStep: number;
  playing: boolean;
  showTransport: boolean;
  showSchools: boolean;
  showEveryday: boolean;
}
export const DEFAULT_SIM: SimState = {
  hour: 10,
  streetLights: true,
  showRoute: true,
  traffic: 1,
  camAngle: 0,
  camZoom: 1,
  walkStep: 0,
  playing: false,
  showTransport: true,
  showSchools: true,
  showEveryday: true
};
function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
export function isNightHour(hour: number): boolean {
  return hour < 7 || hour >= 18;
}
export function validateSimState(v: unknown): { ok: boolean; sim?: SimState; error?: string } {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "Simulation state must be an object." };
  const r = v as Record<string, unknown>;
  const { hour, streetLights, showRoute, traffic, camAngle, camZoom, walkStep, playing } = r;
  if (typeof hour !== "number" || !Number.isFinite(hour)) return { ok: false, error: "Simulation hour must be a finite number." };
  if (typeof traffic !== "number" || !Number.isFinite(traffic)) return { ok: false, error: "Simulation traffic must be a finite number." };
  if (typeof camAngle !== "number" || !Number.isFinite(camAngle)) return { ok: false, error: "Simulation camera angle must be a finite number." };
  if (typeof camZoom !== "number" || !Number.isFinite(camZoom)) return { ok: false, error: "Simulation camera zoom must be a finite number." };
  if (typeof walkStep !== "number" || !Number.isFinite(walkStep)) return { ok: false, error: "Simulation walk step must be a finite number." };
  if (typeof streetLights !== "boolean") return { ok: false, error: "Simulation streetLights must be a boolean." };
  if (typeof showRoute !== "boolean") return { ok: false, error: "Simulation showRoute must be a boolean." };
  if (typeof playing !== "boolean") return { ok: false, error: "Simulation playing must be a boolean." };
  const opt = (k: string, dflt: boolean): boolean | null => {
    const x = r[k];
    if (x === undefined) return dflt;
    if (typeof x !== "boolean") return null;
    return x;
  };
  const st = opt("showTransport", true);
  const ss = opt("showSchools", true);
  const se = opt("showEveryday", true);
  if (st === null || ss === null || se === null) return { ok: false, error: "Simulation layers must be booleans." };
  const sim: SimState = {
    hour: clamp(Math.round(hour as number), HOUR_MIN, HOUR_MAX),
    streetLights: streetLights as boolean,
    showRoute: showRoute as boolean,
    traffic: clamp(Math.round(traffic as number), TRAFFIC_MIN, TRAFFIC_MAX),
    camAngle: clamp(Math.round(camAngle as number), CAM_ANGLE_MIN, CAM_ANGLE_MAX),
    camZoom: clamp(camZoom as number, CAM_ZOOM_MIN, CAM_ZOOM_MAX),
    walkStep: clamp(Math.round(walkStep as number), WALK_MIN, WALK_MAX),
    playing: playing as boolean,
    showTransport: st as boolean,
    showSchools: ss as boolean,
    showEveryday: se as boolean
  };
  return { ok: true, sim };
}
export function clampSimState(v: unknown): SimState {
  const r = validateSimState(v);
  if (r.ok && r.sim) return r.sim;
  return { ...DEFAULT_SIM };
}
export function timeLabel(hour: number): string {
  const h = clamp(Math.round(hour), HOUR_MIN, HOUR_MAX);
  return String(h).padStart(2, "0") + ":00";
}
export function lightLabel(sim: SimState): string {
  return isNightHour(sim.hour) ? "Night" : sim.hour >= 16 ? "Dusk" : "Daylight";
}
export function trafficLabel(t: number): string {
  if (t <= 0) return "Quiet (0/2)";
  if (t >= 2) return "Busy (2/2)";
  return "Calm (1/2)";
}
export interface Lighting {
  isNight: boolean;
  sky: string;
  ground: string;
  windowLit: boolean;
  lampGlow: boolean;
  label: string;
}
export function getLighting(sim: SimState): Lighting {
  const isNight = isNightHour(sim.hour);
  const dusk = !isNight && sim.hour >= 16;
  return {
    isNight,
    sky: isNight ? "#2e3a44" : dusk ? "#e8d9bd" : "#dce8ec",
    ground: isNight ? "#d9d2bd" : "#f3eee0",
    windowLit: isNight || (dusk && sim.streetLights),
    lampGlow: isNight && sim.streetLights,
    label: lightLabel(sim)
  };
}
export function homeName(id: string): string {
  if (id === "demo-b" || id === "live-b") return "Moonlight House";
  return "Sunlit House";
}
export function stopName(id: string): string {
  if (id === "route") return "Daily route";
  if (id === "entrance") return "Entrance";
  return "Street";
}
export interface ScenarioInsight {
  title: string;
  body: string;
  question: string;
}
export function scenarioInsight(homeId: string, stopId: string, sim: SimState): ScenarioInsight {
  const hn = homeName(homeId);
  const sn = stopName(stopId);
  const t = timeLabel(sim.hour);
  const light = lightLabel(sim);
  const traf = trafficLabel(sim.traffic);
  const lamps = sim.streetLights ? "street lamps on" : "street lamps off";
  const route = sim.showRoute ? "planned walking route shown" : "route hidden";
  if (stopId === "route") {
    return {
      title: hn + " · " + sn + " · " + t,
      body: "Fictional " + light.toLowerCase() + " walk with " + traf.toLowerCase() + ", " + lamps + ", " + route + ". Assumes a slow stroll past the grocery shop and station crossing. Not a measured walking time.",
      question: sim.traffic >= 2 ? "Where would you wait if the crossing felt crowded at " + t + "?" : "What would you check along this route after 9pm?"
    };
  }
  if (stopId === "entrance") {
    return {
      title: hn + " · " + sn + " · " + t,
      body: "Fictional entrance check in " + light.toLowerCase() + " light, " + lamps + ". Assumes visible steps, mailbox, and recycling corner. Interior condition is not modeled.",
      question: "Is the stair handrail and entry light easy to find at " + t + "?"
    };
  }
  return {
    title: hn + " · " + sn + " · " + t,
    body: "Fictional street front in " + light.toLowerCase() + " light with " + traf.toLowerCase() + " traffic, " + lamps + ", " + route + ". Assumes lamp spacing and sidewalk edges as drawn. Not real brightness or noise data.",
    question: sim.hour >= 20 || sim.hour < 7 ? "Can you picture this corner at " + t + " with the lamps " + (sim.streetLights ? "on" : "off") + "?" : "What catches your eye first on this corner at " + t + "?"
  };
}
export function snapshotText(homeId: string, stopId: string, sim: SimState): string {
  const ins = scenarioInsight(homeId, stopId, sim);
  return "Solan Village · " + homeName(homeId) + " · " + stopName(stopId) + " · " + timeLabel(sim.hour) + " · " + lightLabel(sim) + " · Street lights " + (sim.streetLights ? "on" : "off") + " · Traffic " + trafficLabel(sim.traffic) + " · Route " + (sim.showRoute ? "shown" : "hidden") + ". " + ins.body + " " + FICTION_LABEL + ".";
}
export interface Box3 {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  roof: "terracotta" | "concrete" | "pale";
  wall: string;
  label: string;
  home?: string;
  kind?: "home" | "transport" | "school" | "everyday" | "base";
}
export const WORLD_BOXES: Box3[] = [
  { id: "home-a", x: -30, z: -10, w: 16, d: 13, h: 11, roof: "terracotta", wall: "#f4ead3", label: "Sunlit House", home: "demo-a", kind: "home" },
  { id: "home-a-steps", x: -30, z: 0, w: 6, d: 3, h: 1.6, roof: "concrete", wall: "#d8d2c2", label: "Sunlit steps", home: "demo-a", kind: "base" },
  { id: "home-a-shed", x: -40, z: -12, w: 5, d: 5, h: 4, roof: "pale", wall: "#e9e2cf", label: "Sunlit shed", home: "demo-a", kind: "base" },
  { id: "home-b", x: 30, z: -10, w: 16, d: 13, h: 11, roof: "concrete", wall: "#efe9d6", label: "Moonlight House", home: "demo-b", kind: "home" },
  { id: "home-b-steps", x: 30, z: 0, w: 6, d: 3, h: 1.6, roof: "concrete", wall: "#d8d2c2", label: "Moonlight steps", home: "demo-b", kind: "base" },
  { id: "home-b-shed", x: 40, z: -12, w: 5, d: 5, h: 4, roof: "pale", wall: "#e9e2cf", label: "Moonlight shed", home: "demo-b", kind: "base" },
  { id: "cafe", x: -12, z: -26, w: 12, d: 9, h: 7, roof: "terracotta", wall: "#f2e4c8", label: "Corner cafe", kind: "everyday" },
  { id: "grocery", x: 4, z: -27, w: 13, d: 9, h: 7.5, roof: "pale", wall: "#ece6d2", label: "Grocery shop", kind: "everyday" },
  { id: "station", x: 48, z: -30, w: 16, d: 10, h: 9, roof: "concrete", wall: "#e3ddc9", label: "Station", kind: "transport" },
  { id: "platform", x: 48, z: -20, w: 18, d: 4, h: 1.2, roof: "concrete", wall: "#cfc8b2", label: "Platform", kind: "transport" },
  { id: "park-shelter", x: -48, z: 8, w: 10, d: 8, h: 5, roof: "terracotta", wall: "#eee3c9", label: "Park shelter", kind: "everyday" },
  { id: "school", x: -52, z: -34, w: 14, d: 9, h: 8, roof: "pale", wall: "#e8e2cc", label: "Schematic school", kind: "school" },
  { id: "childcare", x: -36, z: -34, w: 9, d: 7, h: 5.5, roof: "terracotta", wall: "#f0e4c9", label: "Childcare room", kind: "school" },
  { id: "row-1", x: -14, z: 24, w: 10, d: 8, h: 8, roof: "pale", wall: "#e8e1cc", label: "Row house 1", kind: "base" },
  { id: "row-2", x: -2, z: 24, w: 10, d: 8, h: 8, roof: "terracotta", wall: "#efe6cf", label: "Row house 2", kind: "base" },
  { id: "row-3", x: 10, z: 24, w: 10, d: 8, h: 8, roof: "pale", wall: "#e8e1cc", label: "Row house 3", kind: "base" },
  { id: "row-4", x: 22, z: 24, w: 10, d: 8, h: 8, roof: "terracotta", wall: "#efe6cf", label: "Row house 4", kind: "base" },
  { id: "kiosk", x: -52, z: -24, w: 7, d: 6, h: 5, roof: "pale", wall: "#e7dfc8", label: "Kiosk", kind: "everyday" },
  { id: "library", x: -52, z: -12, w: 9, d: 8, h: 7, roof: "concrete", wall: "#e5ddc6", label: "Library", kind: "school" },
  { id: "clinic", x: 52, z: 8, w: 9, d: 8, h: 7, roof: "pale", wall: "#ece4cd", label: "Clinic", kind: "everyday" },
  { id: "bakery", x: -12, z: 6, w: 9, d: 7, h: 6, roof: "terracotta", wall: "#f1e5c9", label: "Bakery", kind: "everyday" },
  { id: "laundry", x: 2, z: 6, w: 8, d: 7, h: 6, roof: "concrete", wall: "#e9e1ca", label: "Laundry", kind: "everyday" },
  { id: "gate-a", x: -30, z: 10, w: 8, d: 1.4, h: 2.4, roof: "concrete", wall: "#c9c2ab", label: "Sunlit gate", home: "demo-a", kind: "base" },
  { id: "gate-b", x: 30, z: 10, w: 8, d: 1.4, h: 2.4, roof: "concrete", wall: "#c9c2ab", label: "Moonlight gate", home: "demo-b", kind: "base" }
];
export const IMPORTANT_LABELS = new Set(["home-a", "home-b", "station", "grocery", "cafe", "school", "childcare", "park-shelter"]);
export const WORLD_TREES: { id: string; x: number; z: number; s: number }[] = [
  { id: "t1", x: -44, z: -2, s: 1 },
  { id: "t2", x: -38, z: 14, s: 1.2 },
  { id: "t3", x: -56, z: 16, s: 1 },
  { id: "t4", x: -20, z: -14, s: 0.9 },
  { id: "t5", x: 16, z: -14, s: 0.9 },
  { id: "t6", x: 42, z: -2, s: 1.1 },
  { id: "t7", x: -8, z: 14, s: 1 },
  { id: "t8", x: 38, z: 16, s: 1 }
];
export const WORLD_LAMPS: { id: string; x: number; z: number }[] = [
  { id: "l1", x: -38, z: 4 },
  { id: "l2", x: -20, z: 4 },
  { id: "l3", x: -2, z: 4 },
  { id: "l4", x: 16, z: 4 },
  { id: "l5", x: 34, z: 4 },
  { id: "l6", x: 48, z: -12 }
];
export const ROUTE_PTS: { x: number; z: number }[] = [
  { x: -30, z: 2 },
  { x: -20, z: 4 },
  { x: -2, z: 4 },
  { x: 12, z: -6 },
  { x: 30, z: -2 },
  { x: 44, z: -16 }
];
export const TRANSIT_PTS: { x: number; z: number }[] = [
  { x: 40, z: -38 },
  { x: 48, z: -30 },
  { x: 56, z: -22 }
];
export const STOP_ANCHORS: Record<string, { x: number; z: number }> = {
  around: { x: -30, z: 6 },
  route: { x: 12, z: -2 },
  entrance: { x: 30, z: 2 }
};
export function vehiclesFor(traffic: number): { x: number; z: number; color: string }[] {
  if (traffic <= 0) return [];
  if (traffic >= 2) {
    return [
      { x: -24, z: 12, color: "#7a8a99" },
      { x: -4, z: 12, color: "#a3764f" },
      { x: 18, z: 12, color: "#6f7f6a" },
      { x: 36, z: -22, color: "#8a7a5f" }
    ];
  }
  return [
    { x: -10, z: 12, color: "#7a8a99" },
    { x: 24, z: -22, color: "#a3764f" }
  ];
}
export function project(x: number, y: number, z: number, camAngleDeg: number, zoom: number, ox: number, oy: number): { x: number; y: number } {
  const sx = x * WORLD_SCALE;
  const sy = y * WORLD_SCALE;
  const sz = z * WORLD_SCALE;
  const rad = (camAngleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const xr = sx * cos - sz * sin;
  const zr = sx * sin + sz * cos;
  return {
    x: ox + (xr - zr) * 0.866 * zoom,
    y: oy + (xr + zr) * 0.5 * zoom - sy * zoom
  };
}
export function rotatedDepth(x: number, z: number, camAngleDeg: number): number {
  const rad = (camAngleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const xr = x * cos - z * sin;
  const zr = x * sin + z * cos;
  return xr + zr;
}
export function roofFill(roof: Box3["roof"], isNight: boolean): string {
  const base = roof === "terracotta" ? "#c08552" : roof === "concrete" ? "#cfc9b8" : "#ddd3ba";
  if (!isNight) return base;
  return roof === "terracotta" ? "#8a5f3c" : "#8f8875";
}
