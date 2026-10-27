# Backend notes

Local behavior and public static behavior are different. Read this before setting environment variables.

## Local versus public

- Local `npm run dev`: Vite plus Express together. Live housing proxy and optional local Muse assistant are available.
- Local `npm start`: serves the built local app on port `3001`.
- Public `npm run build:web`: static frontend in `dist/` plus `api/housing.ts` for Vercel. No `/api/muse` is exposed or called.
- Public `npm run preview` on port `4173` previews only the static build. It does not run the serverless housing handler.
- Vercel deployment is planned, but account selection and permissions are pending. No live public URL exists. Use Import Git Repository with `npm run build:web` and `dist/` output plus the `api/housing` function. Do not disable preview protection.

## Scripts

- `npm run dev` runs Vite and the API together with `concurrently`.
- `npm run dev:client` runs Vite only.
- `npm run dev:server` runs `tsx server/server.ts`.
- `npm test` runs unit and integration tests (TypeScript typecheck + PUBLIC build passed; 65 unit/integration passed; local end-to-end 15 passed; public end-to-end 1 comprehensive passed covering district fixture, prewritten field guide with 0 Muse calls, A900/B800 draft isolation + snapshots, clear + JSON import persist, and 390 mobile overflow). Latest recorded results: [source-provenance.json](source-provenance.json).
- `npm run typecheck` runs `tsc --noEmit -p tsconfig.json` and `tsc --noEmit -p tsconfig.server.json`.
- `npm run build` typechecks, builds the frontend, then emits `dist-server/server.js`.
- `npm run build:web` builds the PUBLIC-mode static frontend.
- `npm run test:e2e` and `npm run test:e2e:public` cover local and public browser flows.
- Commands: `npm test`, `npm run build:web`, `npm run test:e2e`, `npm run test:e2e:public`. `docs/ci-template.yml` is an inactive template.
- Node `>=22.12.0` is required.
- `vite.config.ts` imports `defineConfig` from `vitest/config` so the `test` field is valid.

## Environment setup

`.env` is optional. Copy `.env.example` and leave values empty unless you intentionally enable a feature. Never commit keys.

- Fictional scene: no keys needed.
- Live housing lookup: network only, no upstream secret currently needed.
- Optional server geocoding: `KAKAO_REST_API_KEY`.
- Optional browser map key: `VITE_KAKAO_JS_KEY`. Apply provider domain restrictions. In public mode the user confirms a real address manually and then opens official map links. No fake verified coordinates are created.
- Optional local Muse assistant, actual `muse-spark-1.3` only, provider Meta fixed, no alternative fallback:
  - `MODEL_API_KEY` or installed CLI path `MUSE_BIN`, plus positive `MUSE_BUDGET_USD`.
  - Optional `MUSE_MAX_CALLS`, default `10`, strict positive integer.
  - Private `MUSE_LEDGER_PATH`, default `./data/muse-ledger.json`, ignored by git, never under public `dist/`.
  - Do not set a real paid cap for someone else. The example files use empty defaults, meaning disabled.

## What the assistant receives

Only after the user presses the assistant action:

Selected home identity, address or coordinates, its notes up to 60 plus visit memos up to 5, selected stop, priorities, and initial questions. Global visit notes and housing finances are not sent.

Claims and evidence IDs in output are validated. Unknown fields are stripped. Nulls return errors rather than crashing. Model output is at most 3 questions ending in `?` or `？` with known evidence IDs. Status `Before AI connection...` returns a labelled `local-template` check, never a Muse answer. Configured status says `Muse configured · connection untested...`. Neither claims success until an actual model response is verified.

## Muse CLI exact form

Exact installed command, run with `execFile` without a shell, 120s timeout, 16MB `maxBuffer`, `MUSE_NO_AUTO_UPDATE=1`, safe temp prompt file removed afterwards:

`muse exec --preset empty --provider meta --model muse-spark-1.3 --contributor-mode off --disable-shell --disable-write --disable-web-tools --disable-reminders --no-foreign-personal-context --approval-mode untrusted --approval-judge off --max-model-steps 1 --json --prompt-file PATH`

`--preset empty` comes immediately after `exec` to withhold workspace file tools. No `--trust` or `--yolo`, no extra models. Existing CLI login is used. No auth token files are read.

Events use `payload_type` and `payload`. Success needs `run.model.configured` for `meta` and `muse-spark-1.3`, producer `stream_succeeded` for the same model, and `run.terminal.completed.text`. Only terminal text is parsed. Terminal `{"error":...}` still consumes known usage.

## API transport and budget

Native `fetch` only to fixed `https://api.meta.ai/v1/chat/completions`. Requires `response.model === muse-spark-1.3`, `prompt_tokens` and `completion_tokens`, cached tokens from `prompt_tokens_details.cached_tokens`. Responses prefer `response_format: { type: "json_object" }`, otherwise exact `JSON.parse` with optional fences. Greedy brace extraction is forbidden.

One action makes one model call. CLI reserves conservative `1.90 USD`; API reserves a byte-based input upper bound plus `600` output tokens. Actual cost is `(input-cached)*1.25+cached*0.15+output*4.25` per 1M. Missing usage retains the reservation. Over-reserve actuals are recorded and block later work. Corrupt ledgers fail closed; only `ENOENT` initializes. Saves are atomic with temp write plus rename. Ledger serialization covers one local Node process only.
