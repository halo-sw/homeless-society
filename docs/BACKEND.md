# Backend notes (Muse-only, muse-spark-1.3)

Only Muse Spark 1.3 is allowed. No other AI calls or fallbacks.

## Scripts

- `npm run dev` runs Vite and the API together via `concurrently`.
- `npm run dev:client` runs Vite only; `npm run dev:server` runs `tsx server/server.ts`.
- `npm run typecheck` runs `tsc --noEmit -p tsconfig.json` and `tsc --noEmit -p tsconfig.server.json`.
- `npm run build` typechecks, builds the frontend, then emits `dist-server/server.js`.
- `npm start` runs `node dist-server/server.js` on `127.0.0.1`.
- Node `22.22.3` required: `vite@8.3.5`, `@vitejs/plugin-react@6.1.2`, `vitest@5.0.5`.
- `vite.config.ts` imports `defineConfig` from `vitest/config` so the `test` field is valid.

## Env

`.env` is optional. If `.env` exists the server loads it with guarded `process.loadEnvFile`; values are never echoed. Required for live AI: `MODEL_API_KEY` or `MUSE_BIN` plus positive `MUSE_BUDGET_USD`. Optional: `MUSE_MAX_CALLS` (default `10`, strict positive integer), `MUSE_LEDGER_PATH` (must not be under public `dist/`), `PORT`, `KAKAO_REST_API_KEY`.

## Muse CLI

Exact installed command, run with `execFile` (no shell), 120s timeout, 16MB `maxBuffer`, `MUSE_NO_AUTO_UPDATE=1`, safe temp prompt file removed afterwards:

`muse exec --preset empty --provider meta --model muse-spark-1.3 --contributor-mode off --disable-shell --disable-write --disable-web-tools --disable-reminders --no-foreign-personal-context --approval-mode untrusted --approval-judge off --max-model-steps 1 --json --prompt-file PATH`

`--preset empty` comes immediately after `exec` to withhold workspace file tools: the default CLI exposes `read_file` despite `--disable-shell`/`--disable-write`, so untrusted observation prompts must never cause workspace reads. No `--trust`/`--yolo`, no extra models, all other flags/approvals stay enabled. Existing CLI login is used; no auth token files are read. Only user-supplied session metadata is sent, with no default workspace extras under the empty preset.

Events use `payload_type`/`payload`. Success needs `run.model.configured` (`meta`/`muse-spark-1.3`), producer `stream_succeeded` for the same model, and `run.terminal.completed.text`. Only terminal text is parsed; reasoning deltas are ignored. `run.usage` input includes cached tokens; output already includes reasoning. Missing/malformed usage keeps the full reservation. Terminal `{"error":...}` still consumes known usage.

## API transport

Native `fetch` only to fixed `https://api.meta.ai/v1/chat/completions`. Requires `response.model === muse-spark-1.3`, `prompt_tokens`/`completion_tokens`, cached from `prompt_tokens_details.cached_tokens` (`cached <= input`). System instructions are separate from untrusted session JSON. Responses prefer `response_format: { type: "json_object" }`, else exact `JSON.parse` with optional fences; greedy brace extraction is forbidden.

## Budget

One action makes one model call. CLI reserves conservative `1.90 USD`; API reserves a byte-based input upper bound plus `600` output tokens. Actual cost is `(input-cached)*1.25+cached*0.15+output*4.25` per 1M; known usage is charged even when the answer is invalid. Missing usage retains the reservation. Over-reserve actuals are recorded and block later work. Corrupt/unreadable ledgers fail closed; only `ENOENT` initializes. Saves are atomic (temp write + rename). Keyword filtering does not guarantee factual safety.

Ledger serialization covers one local Node process only. Concurrent processes can race the file and overspend; run one API process per ledger file.

## Validation and status

Sessions are strictly validated: 0-2 unique candidates, observations bound to known candidates, valid `activeCandidateId`/stop/source, priorities from 4 choices (max 3), bounded questions/strings, real booleans, ISO dates or null, `http(s)` URLs without credentials, 200KB cap. Unknown fields are stripped; nulls return errors instead of crashing. Model output is max 3 questions ending in `?`/`？` with known `evidenceIds`; any foreign id rejects that question. Status `AI 연결 전` returns a labelled `local-template` check, never a Muse answer; configured status says `구성됨 · 연결 미테스트`.
