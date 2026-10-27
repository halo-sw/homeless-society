# Design rounds

## Round 1 — implemented

Astryx foundation plus the core experience: Astryx 0.7.4 Button, Badge, Slider, and SegmentedControl; schematic SVG Solan Village; district transaction sample; and the 12-category factor model with weights, presets, and evidence states.

## Round 2 — implemented

Progressive disclosure, first-screen call to action, merged Explore workspaces, and home-isolated evidence and scenario drafts. Each home keeps its own notes, factor evidence, memos, and scenario drafts. Stores up to 20 snapshots total; Compare shows the latest per home.

## Round 3 — implemented verification fixes

First-click guard, input styling, duplicate-control removal, default-fee unit correction to 0.15M KRW, stale-query invalidation, and strict JSON import validation. Typecheck now includes the Vercel API file.

## Acceptance QA — completed for listed automated checks

Acceptance checks are completed for the listed automated checks. No user-satisfaction score, award, guarantee, fraud-prevention claim, or hosted-service claim is made. Full accessibility testing is not claimed, user study is unmeasured, and deployment is still pending.

Reusable acceptance criteria:

- Desktop two-column and 390px mobile layouts have no overflow.
- Keyboard focus is visible and every control is reachable.
- Fresh load supports one-click entry with no account or keys.
- Source, time, and assumption labels stay visible on samples and scenarios.
- State continuity holds across Prepare, Explore, and Compare, including return to visit.
- Strict import rejects oversize, bad-schema, bad-URL, and out-of-range input.

Current signal: TypeScript typecheck + PUBLIC build passed; 65 unit/integration passed; local end-to-end 15 passed; public end-to-end 1 comprehensive passed covering district fixture, prewritten field guide with 0 Muse calls, A900/B800 draft isolation + snapshots, clear + JSON import persist, and 390 mobile overflow. Commands: `npm test`, `npm run build:web`, `npm run test:e2e`, `npm run test:e2e:public`. Latest recorded results: [source-provenance.json](source-provenance.json). `docs/ci-template.yml` is an inactive template; no active CI.

## Round 4 — implemented

Comparison table uses `th scope="row"` row headers with first-column and striping styles updated, conditional public footer stays honest, and export/import JSON roundtrip preserves notes, district, and scenarios. Acceptance verification record: see [source-provenance.json](source-provenance.json) for latest recorded results. Full accessibility testing is not claimed.

## Future work, kept separate

Actually geo-grounded scenes, verified data providers, consented social sources, and stronger user research remain future work. They are not claimed as delivered.
