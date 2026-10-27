# Homeless Society 한국어 안내

내 집 마련을 준비하는 사람을 위한 오픈소스 가상 임장·생활 시나리오 노트입니다.

> 전세 사기의 정보 비대칭 문제에서 출발했습니다. 더 좋은 질문, 날짜가 남는 근거, 두 집 비교를 돕습니다. 사기 탐지기가 아니며 등기·계약·현장 확인을 대신하지 않습니다.

## 3단계로 이해하기

1. **준비**: 일상 우선순위 최대 3개, 첫 질문, 지역 거래 표본, 12개 요인 가중치를 정합니다.
2. **가상 임장**: 솔란 마을의 Sunlit House(햇살집)·Moonlight House(달빛집) 2곳과 Street(거리)·Daily route(일상 동선)·Entrance(현관) 3곳을 오가며 기록합니다. Field notes(현장 노트)·Life scenarios(생활 시나리오)·Housing checks(주거 점검) 탭을 쓰고 Save scenario snapshot(스냅샷 저장)으로 저장합니다.
3. **정리·비교**: Go to compare(비교로 이동)로 관찰과 빠진 근거, 시나리오 요약, 미해결 질문, 체크리스트를 비교합니다. Save record JSON(기록 저장)/Import record(가져오기)로 백업합니다.

처음 화면의 **Enter simulation**(가상 임장 시작)을 누르면 바로 시작됩니다. 계정과 키가 필요 없습니다.

## 화면 보기

![준비 화면: 우선순위, 지역 검색, 요인 가중치](docs/images/prepare.png)
![가상 임장: 마을 모형, 집·경유지 전환, 기록 탭](docs/images/virtual-visit.png)
![비교 화면: 나란히 비교, 빠진 근거, 지역 표본](docs/images/compare.png)
![시나리오: 가격·대출·통근·가정 입력과 기준·스트레스 결과](docs/images/scenario.png)

그림은 실제 집이 아니라 가상 모형입니다.

## 빨리 시작하기

```sh
git clone https://github.com/halo-sw/homeless-society.git
cd homeless-society
npm ci
npm run dev
```

`http://localhost:5173`을 열고 가상 장면을 확인하세요. 실제 거래 조회에는 네트워크가 필요합니다.

자세한 순서는 [시작 안내](docs/GETTING_STARTED.ko.md)를 보세요.

## 중요한 제한

- 점수·예측을 만들지 않습니다. 집값 예측, 학군 합격 예측, 범죄 점수가 없습니다.
- 지역 실거래 표본은 참고용 맥락입니다. 가상 마을에 그대로 옮겨지지 않습니다.
- 세금·보험·대출 자격과 실제 승인은 다루지 않습니다.
- PUBLIC 모드의 현장 가이드는 미리 쓴 안내문이며 실시간 생성 AI가 아닙니다.
- 저장은 브라우저만 사용합니다. 계정·클라우드 동기화가 없습니다. 내보내기에는 주소와 메모가 들어 있습니다.

## 자료 출처

국토부 실거래 보고자료를 k-skill 프록시로 조회합니다. 자세한 계약 조건과 한계는 [DATA_SOURCES](docs/DATA_SOURCES.md)를 보세요. 학교·지도·공공데이터 링크도 거기에 있습니다.

## 기술 요약

영문 UI, React 19, Vite 8, TypeScript, Astryx 0.7.4, StyleX를 사용합니다. SVG 가상 마을은 렌더링 서버나 AI 호출 없이 움직입니다. 데스크톱은 지도 중심 2열, 모바일은 쌓임형입니다.

## 기여와 라이선스

처음 오신 분을 환영합니다. 어색한 문장, 재현 순서, 접근성 의견이 큰 도움이 됩니다. 실제 주소·금액·키를 올리지 마세요. 앱 코드는 Muse Spark 1.3만 작성합니다. 자세한 방법은 [CONTRIBUTING.md](CONTRIBUTING.md)를 보세요.

검증: TypeScript 타입체크 + PUBLIC 빌드 통과; `npm test`(단위·통합 65개 통과); 로컬 E2E(15개 통과); PUBLIC E2E(종합 1개 통과, 지역 표본·사전 작성 현장 가이드 0 Muse 호출·A900/B800 초안 분리+스냅샷·초기화+JSON 가져오기 유지·390 모바일 넘침 포함). 명령: `npm test`, `npm run build:web`, `npm run test:e2e`, `npm run test:e2e:public`. 최신 기록: [source-provenance.json](docs/source-provenance.json). `docs/ci-template.yml`은 비활성 템플릿이며 활성 CI는 없습니다.

저희 코드에만 MIT가 적용됩니다. 지도와 외부 콘텐츠 권리는 각 제공자에 있습니다.
