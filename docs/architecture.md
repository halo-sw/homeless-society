# Architecture

## Stack

- Client: React 18 + Vite 8 + TypeScript.
- Server: Express, local-only on `127.0.0.1`.
- Model: Muse Spark 1.3 only.

## Flow

Prepare → Visit → Summary.

- Visit contains MapView, field notebook, and MusePanel.
- Summary limits: max 2 homes, 3 stops.

## Server routes

- `GET /api/health`
- `GET /api/muse/status`
- `POST /api/geocode`
- `POST /api/muse/questions`

## Model-call boundaries

- One model call per action.
- No retries.
- Correction: there are **not** 3 model attempts, and 45s does **not** apply to both transports.
- API transport timeout: 45s; `maxoutput` 600; conservative prompt byte upper bound.
- CLI transport timeout: 120s; empty preset disables workspace tools; fixed flags: no shell/write/web; one step; model-config, producer, and usage validation.

## Cost controls

- CLI conservative reservation: $1.90; actual spend reconciled.
- Budget rates per 1M tokens: $1.25 input, $0.15 cached, $4.25 output.
- Input total includes cached tokens.

## Data

- Records are local-only in LocalStorage.
- Validated import/export.
- Observations and memos are candidate-bound.
- No private keys, billing data, or customer data are included here.

## Verification status

- Codebase: 44 files authored by Muse.
- Tests: 45 unit/integration + 11 Playwright passed.
- Clean archive build passed on 2026-10-27.
- Kakao is the real geocode provider but remains untested without keys.
- Tested actual flows: manual official-link entry and demo flow.
- GitHub CI is NOT enabled because the authenticated OAuth credential lacks `workflow` permission.
- Identical Muse-authored CI config is available at `docs/ci-template.yml`.
- No CI success is claimed, and no hosted service is claimed.
