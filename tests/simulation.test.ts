import { describe, expect, it } from 'vitest';
import { DEFAULT_SIM, WORLD_BOXES, getLighting, project, scenarioInsight, snapshotText, validateSimState, vehiclesFor } from '../src/domain/simulation';
describe('simulation domain', () => {
  it('has at least twenty useful solids', () => { expect(WORLD_BOXES.length).toBeGreaterThanOrEqual(20); });
  it('separates day and night lighting deterministically', () => {
    const day = getLighting({ ...DEFAULT_SIM, hour: 10, streetLights: true });
    const night = getLighting({ ...DEFAULT_SIM, hour: 21, streetLights: true });
    expect(day.isNight).toBe(false);
    expect(night.isNight).toBe(true);
    expect(day.windowLit).toBe(false);
    expect(night.windowLit).toBe(true);
    expect(night.lampGlow).toBe(true);
    const nightOff = getLighting({ ...DEFAULT_SIM, hour: 21, streetLights: false });
    expect(nightOff.lampGlow).toBe(false);
  });
  it('clamps bounds and rejects nonfinite or non-boolean simulation', () => {
    const ok = validateSimState({ ...DEFAULT_SIM, hour: 40, traffic: 9, camAngle: 99, camZoom: 9, walkStep: 9 });
    expect(ok.ok).toBe(true);
    expect(ok.sim?.hour).toBe(23);
    expect(ok.sim?.traffic).toBe(2);
    expect(validateSimState({ ...DEFAULT_SIM, hour: NaN }).ok).toBe(false);
    expect(validateSimState({ ...DEFAULT_SIM, hour: Infinity }).ok).toBe(false);
    expect(validateSimState({ ...DEFAULT_SIM, streetLights: 'yes' }).ok).toBe(false);
    expect(validateSimState({ ...DEFAULT_SIM, showRoute: 1 }).ok).toBe(false);
    expect(validateSimState({ ...DEFAULT_SIM, playing: 'no' }).ok).toBe(false);
  });
  it('builds snapshots with time, light, and traffic', () => {
    const s = snapshotText('demo-a', 'around', { ...DEFAULT_SIM, hour: 21, streetLights: true, traffic: 2 });
    expect(s).toContain('21:00');
    expect(s).toContain('Night');
    expect(s).toContain('2/2');
    expect(s).toContain('Sunlit House');
    expect(s).toContain('Fictional scenario');
  });
  it('varies scenario questions with traffic and hour', () => {
    const busy = scenarioInsight('demo-a', 'route', { ...DEFAULT_SIM, traffic: 2, hour: 10 });
    const calm = scenarioInsight('demo-a', 'route', { ...DEFAULT_SIM, traffic: 0, hour: 10 });
    expect(busy.question).not.toBe(calm.question);
    const night = scenarioInsight('demo-a', 'around', { ...DEFAULT_SIM, hour: 21 });
    expect(night.body.toLowerCase()).toContain('night');
  });
  it('reprojects geometry when the camera rotates (not a flat rotation)', () => {
    const a = project(10, 5, 8, -30, 1, 440, 300);
    const b = project(10, 5, 8, 30, 1, 440, 300);
    expect(a.x).not.toBeCloseTo(b.x, 3);
    expect(a.y).not.toBeCloseTo(b.y, 3);
  });
  it('bounds vehicles by traffic level', () => {
    expect(vehiclesFor(0).length).toBe(0);
    expect(vehiclesFor(1).length).toBe(2);
    expect(vehiclesFor(2).length).toBe(4);
  });
});
