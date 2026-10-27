# Homeless Society

Korean-first open-source virtual housing field-visit note. Helps first-time viewers prepare questions, follow a three-stop route, record observations, and compare candidates.

All application code in this repository was authored by Muse Spark 1.3 (Meta Muse Spark). A human requested implementation; Codex only materializes the files, installs dependencies, and runs checks. Keep this authorship: contributors should not paste other-model output.

Scope: one neighborhood, up to two homes. We do not determine mortgage eligibility, fraud, legal rights, safety, value, crime, or investment outcomes.

## Requirements

- Node 22.22.3 baseline
- No paid calls in tests

## Commands (exact)

```sh
npm ci
npm test
npm run build
npm start
```

Single dev command starts both client and server:

```sh
npm run dev
```

- `npm run dev`: concurrently runs Vite and `tsx server/server.ts`
- `npm test`: `vitest run`
- `npm run build`: `npm run typecheck && vite build && tsc -p tsconfig.server.json`
- `npm start`: serves `dist/` plus API

Local addresses: dev client http://127.0.0.1:5173, prod/server http://127.0.0.1:3001 (override with `PORT`).

## Modes

- DEMO: fully fictional Solanmaeul, schematic SVG only.
- LIVE: only your address, your notes, and available provider data. Without `KAKAO_REST_API_KEY`, `/api/geocode` returns 501 and the UI falls back to manual official-map confirmation (coordinates unverified).

External map integration is untested without keys.

## AI (Muse)

- Server-side `muse-spark-1.3` only (`https://api.meta.ai/v1`), optional local CLI transport via `MUSE_BIN`.
- Credentials: `MODEL_API_KEY` or `MUSE_BIN`, budget `MUSE_BUDGET_USD`, cap `MUSE_MAX_CALLS`, ledger `MUSE_LEDGER_PATH`.
- AI credentials are never used in the browser.
- Default keyless flow is fully functional with a labeled local template.
- When asking Muse, only the selected candidate plus its observations/memos are sent to Meta. When using address search or map, address/coordinates go to Kakao. Records stay in this device otherwise.

## Limitations

- Schematic diagrams are not measured geography; LIVE never invents geometry.
- Roadview/photos are not implied; dates unknown are labeled unknown.
- Completion is separate from resolving every question and guarantees no safety.
- No benchmarks, screenshots of results, funding numbers, or approval claims are made.

See [Korean README](README.ko.md), [architecture](docs/architecture.md), [data sources and limits](docs/data-sources.md), [provenance](docs/PROVENANCE.md), [contributing](CONTRIBUTING.md), [security](SECURITY.md).

License: MIT (2026 halo-sw). Map/content rights belong to their providers; open-source here covers our code only. Public target: https://github.com/halo-sw/homeless-society
