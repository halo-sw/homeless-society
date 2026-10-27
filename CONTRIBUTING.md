# Contributing

Welcome. Small proposals are valuable, especially confusing sentences, reproduction steps, docs fixes, translations, and accessibility feedback.

> 짧은 한국어 안내: 처음 오신 분 환영합니다. 헷갈리는 문장 제보와 짧은 설명 제안도 큰 도움이 됩니다. 실제 주소나 금액, 키는 올리지 마세요.

## What we welcome

- Confusing wording and simpler explanations.
- First-use friction and short usability notes.
- Docs fixes, typos, and awkward English or Korean.
- Reproducible bugs with expected versus actual behavior.
- Keyboard, screen-reader, color-contrast, and motion issues.

Use fictional examples only. Do not post real addresses, amounts, account details, API keys, auth codes, or personal spending. For vulnerabilities, follow `SECURITY.md`. Existing bug form: `.github/ISSUE_TEMPLATE/bug.md`.

## Discuss scope first

Code contributions need scope discussion first. Keep proposals inside Prepare, virtual visit, and Compare. Split large changes into smaller proposals.

App code, configuration, and tests are authored by Muse Spark 1.3 exclusively, provider Meta, no alternative model or fallback. Codex coordinates, reviews, materializes Muse output, and runs checks and git work. Human review is welcome. Calculation and ledger detail is in [Backend](docs/BACKEND.md).

Optional local Muse use and code authorship are separate topics. Assistant calls need server-side budget and evidence validation.

## Checks

For code changes:

```sh
npm ci
npm test
npm run build
```

For screen-flow changes, also run:

```sh
npx playwright install chromium
npm run test:e2e
```

Docs-only changes need only link and wording checks. Now 65 unit tests pass; broader typecheck, build, and local plus public end-to-end checks are in progress. CI is not enabled. `docs/ci-template.yml` is an inactive review template.

## Final requests

- Write briefly and say why the change helps.
- Include reproduction steps and check output for code changes.
- Check links and on-screen wording for docs changes.
- Include no secrets or personal data.

Thank you for reading. Every careful report helps.
