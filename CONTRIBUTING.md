# 기여 안내

> 처음 오신 분, 환영합니다. 헷갈리는 문장 제보와 짧은 설명 제안도 도움이 됩니다.

*Short English note: Korean-first guide. Simple language reports, docs, translations, reproducible bugs, and accessibility feedback are welcome. Please discuss code scope first and use Muse Spark 1.3 exclusively for app code.*

## 환영하는 기여

| 분야 | 예시 |
|---|---|
| 헷갈리는 문장 | 어디가 어려웠는지 알려주기 |
| 사용 느낌 | 처음 써보며 막힌 부분 |
| 문서 | 오타, 더 쉬운 설명 |
| 번역 | 어색한 영어 문장 고치기 |
| 버그 | 같은 순서로 다시 일어나는 문제 |
| 접근성 | 키보드, 화면 낭독, 색 대비 문제 |

재현 가능한 버그 보고를 환영하며, 기대한 결과와 실제 결과를 함께 적어주세요. 가상 예시와 가짜 자료를 쓰고, 실제 주소나 금액은 적지 마세요. 기존 버그 양식은 [.github/ISSUE_TEMPLATE/bug.md](.github/ISSUE_TEMPLATE/bug.md)에 있습니다.

## 먼저 이야기 나누기

코드 기여는 먼저 범위를 이야기해주세요. 제안은 기존 준비→가상 임장→정리·비교 범위 안에서 해주세요. 큰 변경은 나누어 제안해주세요.

## AI로 만드는 규칙

앱 코드와 설정, 테스트는 Muse가 작성하며, 쓰는 모델은 **Muse Spark 1.3**뿐입니다. 다른 모델이나 다른 제공자는 사용하지 않습니다. Codex는 작업을 조율하고 검토하며, Muse 출력을 파일로 만들고 검사와 Git 작업을 수행합니다. 사람 검토를 환영하며, 자세한 계산과 기록 방식은 [백엔드 안내](docs/BACKEND.md)를 보세요.

실행 시 선택 사항인 Muse 연결과 코드 작성 방식은 서로 다른 이야기입니다. AI 도움은 서버 쪽에서 예산과 근거 확인을 갖추고 써야 합니다.

## 안전하게 버그 알리기

가상의 예시로 알려주세요. 실제 주소나 금액, 계좌 정보는 적지 마세요. API 키, 인증 코드, 개인 지출 내역도 적지 마세요. 취약점 보고는 [보안 안내](SECURITY.md)를 따라주세요. 개인정보를 존중하고, 공유 전에 기록 파일 내용을 확인하세요.

## 실행과 검사

코드 변경은 다음 순서로 확인합니다.

```sh
npm ci
npm test
npm run build
```

화면 흐름을 건드렸다면 다음도 실행하세요.

```sh
npx playwright install chromium
npm run test:e2e
```

문서나 문장만 고쳤다면 전체 검사가 필요 없습니다. 바뀐 명령과 링크가 맞는지 확인하면 됩니다. 2026-10-27 기준으로 45개 단위·통합 검사와 11개 Playwright 검사가 통과했고 빌드가 깨끗했습니다.

CI는 지금 켜져 있지 않으며, [docs/ci-template.yml](docs/ci-template.yml)은 검토용 템플릿입니다.

## 마무리 부탁

- 쉬운 한국어로 짧게 써주세요.
- 바꾼 이유를 함께 적어주세요.
- 코드 변경이면 재현 순서와 검사 결과를 함께 적어주세요.
- 문서 변경이면 링크와 화면 문구를 확인해주세요.
- 비밀키나 개인정보를 포함하지 마세요.

읽어주셔서 고맙습니다. 작은 제안도 환영합니다.
