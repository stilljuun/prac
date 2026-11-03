# Product

<!-- impeccable:product-schema 1 -->

> 이 파일은 디자인 스킬(impeccable)이 읽는 제품 기록이다. 내용은 `CLAUDE.md` 에서 옮겼다.
> `(추정)` 표시는 CLAUDE.md 에 직접 적혀 있지 않아 추정한 내용이므로, 틀리면 고친다.

## Platform

web

## Users

- 자동차 충돌해석(CAE) 엔지니어. 개인 PC에서 META 로 run별 결과 CSV를 뽑아 IIHS 구조(intrusion) 판정을 확인하고 run끼리 비교한다.
- DOE 탭은 실험계획·ANOVA 를 잘 모르는 **초보자**도 단계별 화면과 쉬운 설명으로 쓸 수 있어야 한다.
- 화면 언어는 한국어. 사용자는 한국어로 일하는 사내 엔지니어 (추정).

## Product Purpose

하나의 HTML 파일로 된 충돌해석 도구.

1. **Intrusion 뷰어**: run별 CSV를 불러오면 한 화면에 측정값 표 + IIHS 판정구간 차트 + 판정 결과를 보여 준다. 대상은 Small overlap 운전석 · 조수석, Moderate overlap 2.0 의 구조 판정만이다 (더미 상해·구속장치는 범위 밖).
2. **DOE 분석**: 카운터메저 인자로 실험을 설계하고, 해석 결과를 ANOVA 로 분석하고, 최적 수준 조합을 찾는다.

성공 = 엔지니어가 run 폴더를 고르자마자 등급과 원인 측정위치를 바로 읽고, 설계안끼리 비교해 다음 카운터메저를 정할 수 있는 것.

## Operating Context

- 해석 결과 폴더 구조: `<run 폴더>/<서브폴더>/results.csv`. 폴더 선택 · 파일 선택 · 드래그 앤 드롭으로 여러 run 을 한 번에 불러온다.
- 시험 종류는 CSV 측정위치 이름으로 자동 판별해 시험 탭에 나눈다.
- 결과 표는 엑셀로 복사 · 붙여넣기, CSV 내보내기, 작업 저장(.json)을 한다.
- 브라우저에서 파일을 바로 연다 (서버 없음). 나중에 사내 Google Apps Script 웹앱 + Google Sheet 로 옮길 예정.

## Capabilities and Constraints

- **단일 HTML 파일** (`index.html`): HTML + CSS + vanilla JS. 외부 라이브러리 · 빌드 도구 없음. 차트는 SVG 로 직접 그린다.
- 오프라인 `file://` 에서 동작해야 하므로 웹 폰트 · CDN 에 기대지 않는다 (추정: 외부 라이브러리 금지 원칙에서 도출).
- 단위는 전부 mm. 기준값은 IIHS 원문(cm) × 10.
- 등급 색은 정해져 있다: Good 그린 / Acceptable 옐로우 / Marginal 레드 / Poor 진한 레드 (표 셀 바탕색, 차트 판정구간 배경).
- 차트는 run 을 최대 3개까지 그리고, 색·무늬는 그래프 칸(1·2·3번째) 위치로 고정한다.
- 판정 로직(`rateRun`)과 DOE 로직은 DOM 에 접근하지 않는 순수 함수로 두고 Node 테스트로 검증한다. UI 수정이 이 구간을 건드리면 `node tests/rating.test.js`, `node tests/doe.test.js` 를 돌린다.
- 상세 규칙 · 화면 구성은 `CLAUDE.md` 가 기준이다.

## Evidence on Hand

- `samples/`: 실제 형식의 CSV 샘플 (운전석 낱개 3개, 운전석 10 run, 조수석 6 run, MO 2.0 6 run). 화면 확인은 이 샘플로 한다.
- `docs/mockup/intrusion_chart_mockup.html`: 차트 · 판정 목업.
- 고객사 · 차종 · 실차 시험 결과 같은 실제 데이터는 저장소에 없다. 지어내지 않는다.

## Product Principles

1. 판정이 먼저 보인다: 등급과 그 등급을 만든 측정위치를 한눈에 읽을 수 있어야 한다.
2. 숫자는 정확하고 추적 가능하게: 화면 값은 CSV 와 IIHS 기준으로 되짚을 수 있어야 하고, 꾸밈이 값 읽기를 방해하면 안 된다.
3. 초보자도 따라올 수 있게: DOE 는 단계별로 열리고, 통계 용어에는 쉬운 말 설명을 붙인다.
4. 옮기기 쉽게: 화면 코드와 순수 로직을 나눠 Apps Script 전환 비용을 줄인다.

## Accessibility & Inclusion

- 차트는 색과 함께 무늬로 run 을 구분한다 (색만으로 구분하지 않음).
- 별도 접근성 표준은 정해지지 않았다.
