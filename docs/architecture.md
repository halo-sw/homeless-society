# Architecture

Client: React + Vite + TypeScript (`src/`). Domain logic in `src/domain/session.ts` (state, validation, summary). Demo fixtures in `src/data/demo.ts`. Components: Prep, Visit (MapView + notebook + MusePanel), Summary.

Server: Express (`server/`). Routes: `GET /api/health`, `GET /api/muse/status`, `POST /api/geocode` (Kakao Local address API, 501 manual fallback), `POST /api/muse/questions` (bounded plan/review, max 3 model attempts, small token cap, evidence-ID + allowlist validation, per-IP rate limit, 45s timeout). Budget ledger in `server/budget.ts` (standard prices $1.25 / $0.15 / $4.25 per 1M tokens; CLI ceiling $1.90; persistent file outside public assets, gitignored). Transports in `server/muse.ts` with injectable fetch/exec for tests.

Storage: localStorage session only, validated import/export, explicit clear. Production server serves `dist/` plus API on one port.
