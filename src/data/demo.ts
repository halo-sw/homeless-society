export interface DemoEvidence { id: string; home: string; stop: string; title: string; body: string; sourceType: 'hypothetical' | 'provider'; date: string | null }
export const DEMO_NOTE = 'Fictional demo: Solan Village is an invented place. All names and figures are imaginary visit themes, not real data.';
export const DEMO_HOMES = [{ id: 'demo-a', name: 'Sunlit House', desc: 'Fictional top pick' }, { id: 'demo-b', name: 'Moonlight House', desc: 'Fictional second pick' }];
export const DEMO_EVIDENCE: DemoEvidence[] = [
  { id: 'ev-a1', home: 'demo-a', stop: 'around', title: 'Fictional alley theme', body: 'Check lamp spacing and sidewalk edges yourself on this theme.', sourceType: 'hypothetical', date: null },
  { id: 'ev-a2', home: 'demo-a', stop: 'route', title: 'Fictional daily-route theme', body: 'Theme for the assumed walk to the station and grocery stops.', sourceType: 'hypothetical', date: null },
  { id: 'ev-a3', home: 'demo-a', stop: 'entrance', title: 'Fictional entry theme', body: 'Theme for locks, mailboxes, and the recycling corner.', sourceType: 'hypothetical', date: null },
  { id: 'ev-b1', home: 'demo-b', stop: 'around', title: 'Fictional comparison theme', body: 'Evening-brightness comparison theme for Moonlight House.', sourceType: 'hypothetical', date: null },
  { id: 'ev-b2', home: 'demo-b', stop: 'route', title: 'Fictional bus-route theme', body: 'Theme for the slope and crossing toward the bus stop.', sourceType: 'hypothetical', date: null },
  { id: 'ev-b3', home: 'demo-b', stop: 'entrance', title: 'Fictional building-entry theme', body: 'Theme for stairs and lift presence.', sourceType: 'hypothetical', date: null }
];
