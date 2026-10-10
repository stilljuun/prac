# CLAUDE.md — 충돌해석 Intrusion 뷰어 (로컬 MVP)

## 목표
개인 PC에서 META가 출력한 run별 CSV를 불러오면, 한 화면에 **측정값 표 + IIHS 판정구간 차트 + 판정 결과**가 나오는 앱을 만든다.
자동 수집, 클라우드 저장은 이번 범위가 아니다. 나중에 사내 시스템(Google Apps Script 웹앱)으로 옮길 예정이므로 그 전환이 쉽게 만든다.

## 기술 방침
- **단일 HTML 파일** (`index.html`): HTML + CSS + vanilla JS, 외부 라이브러리 없음, 빌드 도구 없음
- 브라우저로 파일을 열면 바로 동작해야 한다 (서버 불필요)
- CSV는 파일 선택 버튼 또는 드래그 앤 드롭으로 여러 개 불러온다 (파일 1개 = run 1개)
- 차트는 SVG로 직접 그린다
- **출발점: `docs/mockup/intrusion_chart_mockup.html`** — 차트 렌더링과 판정 로직이 이미 구현되어 있고, 샘플 데이터 대신 CSV 데이터를 넣으면 된다

## 화면 구성
1. CSV 불러오기 영역 (다중 파일, 불러온 run 목록, 개별 삭제)
2. run 선택 체크박스 (다중 비교)
3. run별 판정 카드: Lower / Upper / 종합
4. 차트: 판정구간 배경 + 측정위치별 막대 (다중 run은 그룹 막대, 색+무늬 구분, 1개 run이면 막대 위에 값 표시)
5. 표: 행 = 측정위치, 열 = 선택한 run, 셀은 값(cm) + 판정 등급 색 표시

## 코드 구조
기능별로 분리해 나중에 Apps Script로 옮기기 쉽게 한다.
- `PROTOCOL` 설정 객체: 측정위치, 그룹, 기준값 (아래 표)
- `parseCsv(text, fileName)` → `{ runId, name, values: { location_key: value_cm } }`
- `rateRun(run)` → `{ lower, upper, overall }` (순수 함수, DOM 접근 금지)
- `renderChart(runs)`, `renderTable(runs)`, `renderCards(runs)`
- 파일 읽기(FileReader)는 데이터 로드 부분에만 둔다 → 나중에 `google.script.run`으로 교체할 자리

## IIHS Small Overlap 판정 규칙 (Protocol VII, April 2024, 단위 cm)

| location_key | 측정위치 | 그룹 | Good ≤ | Acceptable ≤ | Marginal ≤ |
|---|---|---|---|---|---|
| lower_hinge_pillar | Lower hinge pillar | lower | 15 | 22.5 | 30 |
| footrest | Footrest | lower | 15 | 22.5 | 30 |
| left_toepan | Left toepan | lower | 15 | 22.5 | 30 |
| brake_pedal | Brake pedal | lower | 15 | 22.5 | 30 |
| parking_brake | Parking brake pedal | lower | 15 | 22.5 | 30 |
| rocker_lat | Rocker panel (lat) | lower | 5 | 10 | 15 |
| steering_long | Steering column (long) | upper | 5 | 10 | 15 |
| upper_hinge_pillar | Upper hinge pillar | upper | 7.5 | 12.5 | 17.5 |
| upper_dash | Upper dash | upper | 7.5 | 12.5 | 17.5 |
| left_ip | Left instrument panel | upper | 7.5 | 12.5 | 17.5 |

- Marginal 상한 초과 → Poor. 경계값은 더 좋은 등급 (`value <= 상한`)
- 서브레이팅(lower, upper 각각): 가장 많은 측정값이 속한 구간, 동률이면 더 나쁜 구간
- 단, 그룹 내 최악 측정값보다 한 단계 넘게 좋을 수 없음
- 종합 = lower / upper 중 나쁜 쪽
- 범위 밖: 정성 관찰에 의한 하향, 다중 시험 평균

## 테스트
- `rateRun`은 경계값, 동률, 최악값 제한 케이스를 확인하는 테스트를 둔다 (`tests/rating.test.html` 또는 Node로 실행 가능한 형태)
- `samples/`에 실제 CSV 샘플을 두고 파싱 결과를 확인한다

## 미확정 사항 (추측해서 구현하지 말고 확인 요청)
- [ ] META CSV 포맷: 컬럼 구성, 측정위치 이름 표기, 단위(mm/cm), 원시 측정점(3점) 포함 여부
- [ ] CSV 값에 집계·성분 처리가 이미 반영되어 있는지 (hinge pillar 최댓값, rocker 평균, rocker Y·steering X 성분)
- [ ] run 이름/ID를 파일명에서 가져올지, CSV 내용에서 가져올지

CSV 포맷이 확정되기 전에는 파서를 매핑 테이블(CSV 표기 → location_key) 방식으로 만들어 수정이 쉽게 한다.

## 차기 단계 (지금 구현하지 않음)
- 사내 적용: Google Apps Script 웹앱 + Google Sheet 저장
- 자동화: 해석 결과 폴더에서 CSV 자동 수집 → Drive 업로드
- 기준 run 대비 변화량(Δ), 위치별 run 추이 차트
