# Architecture

## Stack

- Client: React 19 + Vite 8 + TypeScript.
- Local server: Express, bound to `127.0.0.1` only.
- Static public build: `dist/` plus `api/housing.ts` for Vercel.
- UI: Astryx 0.7.4 core and neutral theme with StyleX peer. Components used: Button, Badge, Slider, SegmentedControl.
- Scene: native SVG isometric neighborhood. No rendering service or model call is needed for animation.
- Model: Muse Spark 1.3 only, local optional mode. PUBLIC mode calls no AI.

## Page flow

Prepare, Explore virtual visit, Compare.

- Prepare: priorities max 3, first questions, district research, factor weights and presets, optional real addresses.
- Explore: 2 fictional homes in Solan Village, Sunlit House and Moonlight House; 3 stops Street, Daily route, Entrance. Tabs are Field notes, Life scenarios, Housing checks.
- Compare: side-by-side observations, missing evidence, scenario summaries, factor coverage, district sample, unresolved questions, printable checklist, memos, export and import.

Layout is map-centered two-column on desktop and stacked on mobile. Forms are plain and accessible. Reduced motion is supported.

## Server and serverless

Shared housing logic lives in `server/housing.ts` and is reused by local Express and `api/housing.ts` on Vercel.

Local routes:

- `GET /api/health`
- `GET /api/housing?kind=regions&q=...`
- `GET /api/housing?kind=trades&lawd_cd=11440&deal_ymd=202609&asset=apartment`
- `GET /api/muse/status`
- `POST /api/geocode`
- `POST /api/muse/questions`

PUBLIC static mode exposes and calls no `/api/muse`. `npm run preview` also does not run the serverless housing handler.

Housing safeguards: 12-second upstream deadline, 1MB response bound, redirect rejection, query allowlist, strict row validation, and public cache `s-maxage=300` for non-personal queries.

## State and storage

- Browser-only persistence in `localStorage`, schema version 1.
- Notes, factor evidence, and scenario drafts are isolated per home.
- Observations and memos are candidate-bound.
- Export and import JSON limit is 200KB. Import validates schema, size, URLs, and numeric ranges.
- No accounts, no cloud sync, no analytics configured.

## Scenario model

Inputs: price and cash in KRW million, mortgage annual rate and term, fees, one-way commute minutes and workdays, optional child age, years ahead 1-10, assumed transit improvement and opening year, user growth -5 to 5 percent per year.

Outputs: equal-payment mortgage plus fees, baseline versus +2 percentage-point stress, round-trip commute hours per month, transit saving only after opening year, later child age with no admission prediction, assumed curve `P*(1+g)^t`. Stores up to 20 snapshots total; Compare shows the latest per home.

## Model-call boundaries

- One model call per user action. No retries.
- API transport timeout 45s, max 600 output tokens, conservative byte-based prompt upper bound.
- CLI transport timeout 120s, 16MB buffer, fixed `muse-spark-1.3` Meta provider flags, empty preset, no shell or write tools.
- Sessions send only selected home identity, address or coordinates, its notes up to 60 plus visit memos up to 5, selected stop, priorities, and initial questions. Global notes and housing finances are not sent.
- Budget uses a local serialized ledger. CLI conservative reservation is 1.90 USD plus call count. See [BACKEND.md](BACKEND.md).

## Verification status

TypeScript typecheck + PUBLIC build passed; 65 unit/integration passed; local end-to-end 15 passed; public end-to-end 1 comprehensive passed covering district fixture, prewritten field guide with 0 Muse calls, A900/B800 draft isolation + snapshots, clear + JSON import persist, and 390 mobile overflow. Commands are `npm test`, `npm run build:web`, `npm run test:e2e`, and `npm run test:e2e:public`. Latest recorded results: [source-provenance.json](source-provenance.json). No automated CI is installed. `docs/ci-template.yml` is an inactive template.
