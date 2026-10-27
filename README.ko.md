# Homeless Society (한국어)

낯선 동네 첫 집 보기를 준비하는 가상 임장 노트입니다. 질문 찾기, 세 지점 동선 따라가기, 관찰 기록, 근거 비교를 돕습니다. 대출·사기·법률·안전·시세·범죄·투자 판단은 하지 않습니다.

이 저장소의 애플리케이션 코드는 Muse Spark 1.3이 작성했습니다. 사람이 구현을 요청했고, Codex는 파일 구체화·의존성 설치·검사만 맡습니다. 기여자는 다른 모델 출력을 붙여 넣지 마세요.

범위: 한 동네, 최대 두 집.

## 요구 사항

- Node 22.22.3 기준

## 명령 (정확)

```sh
npm ci
npm test
npm run build
npm start
```

하나로 클라이언트+서버가 함께 뜹니다:

```sh
npm run dev
```

- `npm run dev`: Vite와 `tsx server/server.ts` 동시 실행
- `npm test`: `vitest run`
- `npm run build`: `npm run typecheck && vite build && tsc -p tsconfig.server.json`
- `npm start`: `dist/`와 API 서빙

로컬 주소: 개발 클라이언트 http://127.0.0.1:5173, 운영/서버 http://127.0.0.1:3001 (`PORT`로 변경 가능).

## 모드

- DEMO: 전부 가상인 솔안마을, 개념도 SVG만 사용.
- LIVE: 입력한 주소와 직접 기록, 가능한 제공자 자료만 사용. `KAKAO_REST_API_KEY`가 없으면 501과 수동 공식 지도 확인으로 진행(좌표 미검증).

키 없는 외부 지도 연동은 테스트되지 않은 것으로 표시합니다.

## AI (Muse)

- 서버 전용 `muse-spark-1.3` (`https://api.meta.ai/v1`), 선택적 로컬 CLI(`MUSE_BIN`).
- 환경: `MODEL_API_KEY` 또는 `MUSE_BIN`, 예산 `MUSE_BUDGET_USD`, 상한 `MUSE_MAX_CALLS`, 원장 `MUSE_LEDGER_PATH`.
- AI 자격 증명은 브라우저에서 사용하지 않습니다.
- 키가 없어도 로컬 안내로 전 흐름이 동작합니다.
- Muse 질문 시 선택 후보와 관찰만 Meta로 갑니다. 주소 검색·지도 사용 시 주소·좌표가 Kakao로 갑니다. 그 외 기록은 이 기기에만 둡니다.

## 한계

- 개념도는 실측이 아니며 LIVE에서 지리를 만들어내지 않습니다.
- 사진·촬영일자를 꾸며내지 않고 모름은 모름으로 둡니다.
- 완료 표시는 모든 질문 해결과 별개이며 안전을 보장하지 않습니다.
- 측정하지 않은 만족도·벤치마크·후원금·승인 주장을 하지 않습니다.

자세한 구조는 [architecture](docs/architecture.md), 출처와 한계는 [data-sources](docs/data-sources.md), 출처 기록은 [PROVENANCE](docs/PROVENANCE.md)를 보세요. 라이선스 MIT (2026 halo-sw). 공개 목표: https://github.com/halo-sw/homeless-society
