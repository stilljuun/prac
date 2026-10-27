# CLAUDE.md — 충돌해석 Intrusion 뷰어 (로컬 MVP)

## 목표
개인 PC에서 META가 출력한 run별 CSV를 불러오면, 한 화면에 **측정값 표 + IIHS 판정구간 차트 + 판정 결과**가 나오는 앱을 만든다.
대상은 IIHS 시험 3종의 **구조(structure / intrusion) 판정**이다. 더미 상해·구속장치 판정은 범위가 아니다.
- Small overlap 운전석, Small overlap 조수석, Moderate overlap 2.0

자동 수집, 클라우드 저장은 이번 범위가 아니다. 나중에 사내 시스템(Google Apps Script 웹앱)으로 옮길 예정이므로 그 전환이 쉽게 만든다.

## 기술 방침
- **단일 HTML 파일** (`index.html`): HTML + CSS + vanilla JS, 외부 라이브러리 없음, 빌드 도구 없음
- 브라우저로 파일을 열면 바로 동작해야 한다 (서버 불필요)
- CSV는 **폴더 선택** / 파일 선택 버튼 또는 드래그 앤 드롭(폴더 포함)으로 여러 개 불러온다 (파일 1개 = run 1개)
- 해석 결과 폴더 구조: `<run 폴더>/<서브폴더>/results.csv`. 폴더를 불러오면 하위의 `results.csv`만 모두 읽고, run 이름은 run 폴더 이름에서 가져온다 (서브폴더 이름은 상관없음)
- **시험 종류는 CSV 의 측정위치(location) 이름으로 자동 판별**해 해당 탭에 넣는다 (`detectProtocol`: 아는 이름 수 − 모르는 이름 수가 가장 큰 시험, 동점이면 현재 탭). 세 시험이 섞인 폴더를 한 번에 골라도 탭별로 나뉜다
- 차트는 SVG로 직접 그린다
- **출발점: `docs/mockup/intrusion_chart_mockup.html`** — 차트 렌더링과 판정 로직이 이미 구현되어 있고, 샘플 데이터 대신 CSV 데이터를 넣으면 된다

## 화면 구성
0. 시험 탭: Small overlap · 운전석 / Small overlap · 조수석 / Moderate overlap 2.0 (탭에 run 개수 표시, 탭마다 run 목록·표·그래프 상태가 따로). 탭 아래에 판정 기준 문서 표시
1. 불러오기 영역: 폴더 선택 / CSV 파일 선택 / 드래그 앤 드롭
2. run 목록: run마다 **표 ON/OFF** 체크, 개별 삭제, 표 전체 켜기·끄기, 전체 삭제
3. 판정 카드: **그래프에 그린 run만**. Small overlap 은 Lower / Upper / 종합, MO 2.0 은 구조 단일 판정
4. 차트: 판정구간 배경 + 측정위치별 막대. **표에서 선택한 run을 최대 3개** 그린다 (그룹 막대, 1개면 값 표시)
   - 색·무늬는 그래프 칸(1·2·3번째) 위치로 고정 → 다른 run을 빼도 색이 바뀌지 않음
   - 4번째 선택은 막고 알림. 표에서 끈 run은 그래프에서도 빠짐
   - 새로 불러온 run은 그래프 빈 칸이 있으면 run_id 순으로 자동 선택
   - 그룹이 바뀌는 곳(lower → upper)에 점선
5. 표: 행 = 측정위치, 열 = 표 ON 인 run 전부 (개수 제한 없음, 가로 스크롤 시 첫 열 고정)
   - 셀은 값(mm), 바탕색으로 등급 표시 (Good 그린 / Acceptable 옐로우 / Marginal 레드 / Poor 진한 레드), 열 머리에 "그래프" 체크
   - 맨 아래 판정 줄: Small overlap 은 Lower / Upper / 종합, MO 2.0 은 Structure 한 줄 (그룹 열도 숨김)

## 코드 구조
기능별로 분리해 나중에 Apps Script로 옮기기 쉽게 한다.
- `PROTOCOLS` 설정 객체: 시험별 측정위치, 그룹, 기준값, CSV 표기와 계산 방법 (아래 표). `PROTOCOL` = 운전석 (기본값)
- `CALC`: CSV 한 행 → 판정 값 (`resultant`, `dx`, `dy`, `xyz_or_yz`)
- `detectProtocol(locationNames, fallbackId)` → 시험 id
- `parseCsv(text, fileName, runName, protocol)` → `{ runId, name, test, values: { location_key: value_mm }, warnings }`
- `rateRun(run, protocol)` → 그룹별 판정 + `overall` (순수 함수, DOM 접근 금지). Small overlap `{ lower, upper, overall }`, MO 2.0 `{ structure, overall }`
- `renderChart(runs)`, `renderTable(runs)`, `renderCards(runs)`, `renderTabs()` — 현재 탭의 프로토콜로 그린다
- 파일 읽기(FileReader)는 데이터 로드 부분에만 둔다 → 나중에 `google.script.run`으로 교체할 자리

## IIHS 구조 판정 규칙 (단위 mm)

앱 전체(입력·기준값·차트·표)는 **mm 단위**로 통일한다. 기준값은 IIHS 원문(cm)을 ×10 한 값이다.

### 공통 규칙 (세 시험 모두)
- Marginal 상한 초과 → Poor. 경계값은 더 좋은 등급 (`value <= 상한`)
- 서브레이팅(그룹별): 가장 많은 측정값이 속한 구간, 동률이면 더 나쁜 구간
- 단, 그룹 내 최악 측정값보다 한 단계 넘게 좋을 수 없음
- 종합 = 그룹 판정 중 나쁜 쪽
- 범위 밖: 정성 관찰에 의한 하향, 다중 시험 평균

### Small overlap · 운전석 (Small Overlap Rating Protocol Version VII, April 2024)

| location_key | 측정위치 | 그룹 | Good ≤ | Acceptable ≤ | Marginal ≤ |
|---|---|---|---|---|---|
| lower_hinge_pillar | Lower hinge pillar | lower | 150 | 225 | 300 |
| footrest | Footrest | lower | 150 | 225 | 300 |
| left_toepan | Left toepan | lower | 150 | 225 | 300 |
| brake_pedal | Brake pedal | lower | 150 | 225 | 300 |
| parking_brake | Parking brake pedal | lower | 150 | 225 | 300 |
| rocker_lat | Rocker panel (lat) | lower | 50 | 100 | 150 |
| steering_long | Steering column (long) | upper | 50 | 100 | 150 |
| upper_hinge_pillar | Upper hinge pillar | upper | 75 | 125 | 175 |
| upper_dash | Upper dash | upper | 75 | 125 | 175 |
| left_ip | Left instrument panel | upper | 75 | 125 | 175 |

### Small overlap · 조수석 (같은 문서 Appendix, Figure A-4)
운전석과 같은 규칙 (lower / upper 서브레이팅, 종합은 나쁜 쪽). 운전석 앞쪽 측정점은 평가하지 않는다.

| location_key | 측정위치 | 그룹 | Good ≤ | Acceptable ≤ | Marginal ≤ |
|---|---|---|---|---|---|
| lower_hinge_pillar | Lower hinge pillar | lower | 150 | 225 | 300 |
| footrest | Footrest | lower | 150 | 225 | 300 |
| right_toepan | Right toepan | lower | 150 | 225 | 300 |
| center_toepan | Center toepan | lower | 150 | 225 | 300 |
| rocker_lat | Rocker panel (lat) | lower | 50 | 100 | 150 |
| center_dash | Center dash | upper | 75 | 125 | 175 |
| upper_hinge_pillar | Upper hinge pillar | upper | 75 | 125 | 175 |
| upper_dash | Upper dash | upper | 75 | 125 | 175 |
| right_lower_dash | Right lower dash | upper | 75 | 125 | 175 |

### Moderate overlap 2.0 (Moderate Overlap 2.0 Rating Guidelines Version III, February 2026, Figure 7)
**Lower / Upper 구분 없이** 모든 측정값으로 구조 단일 판정 (그룹 `structure`, 종합 = 구조 판정).
- Toepan·Footrest·Brake pedal: X-Y-Z 합성. 단 X 가 전방(운전석에서 멀어지는 방향)이면 Y-Z 합성만
- Instrument panel: 후방(X) 이동만

| location_key | 측정위치 | Good ≤ | Acceptable ≤ | Marginal ≤ |
|---|---|---|---|---|
| footrest | Footrest | 150 | 225 | 300 |
| left_toepan | Left toepan | 150 | 225 | 300 |
| center_toepan | Center toepan | 150 | 225 | 300 |
| right_toepan | Right toepan | 150 | 225 | 300 |
| brake_pedal | Brake pedal | 150 | 225 | 300 |
| left_ip | Left instrument panel | 50 | 100 | 150 |
| right_ip | Right instrument panel | 50 | 100 | 150 |
| door_opening | Door opening | 50 | 100 | 150 |

## 테스트
- `rateRun`은 경계값, 동률, 최악값 제한 케이스를 확인하는 테스트를 둔다 (`tests/rating.test.html` 또는 Node로 실행 가능한 형태)
  - 실행: `node tests/rating.test.js` (index.html 의 `@core-start` ~ `@core-end` 구간을 읽어 테스트)
  - 시험별 기준값이 IIHS 그림과 같은지, MO 2.0 의 성분 규칙(Y-Z, 후방 X), 시험 자동 판별도 확인한다
- `samples/`에 실제 CSV 샘플을 두고 파싱 결과를 확인한다
  - `samples/R00x_*.csv`: 운전석 낱개 CSV 3개
  - `samples/small_overlap_driver/R0xx_*/output/results.csv`: 운전석 데모 run 10개 (run 1~3은 낱개 CSV와 같은 값, run 8은 Poor 포함)
  - `samples/small_overlap_passenger/…`: 조수석 데모 run 6개 (run 3 은 경계값 150, run 5 는 Poor 포함)
  - `samples/moderate_overlap_2/…`: MO 2.0 데모 run 6개 (run 4 는 Poor 포함, run 5 는 Right toepan X 전방 → Y-Z 규칙)
  - `samples` 폴더를 통째로 고르면 세 시험이 탭별로 나뉘어 들어간다

## CSV 포맷 (확정)

예시: `samples/R001_baseline.csv`

```
run_id,location,point,dx_mm,dy_mm,dz_mm,resultant_mm
1,Lower_Hinge_Pillar,1,66.39,22.63,27.78,75.44
```

- 파일 1개 = run 1개. 단위 mm, 측정점(`point`)은 원시값 그대로 들어 있다 (집계 안 됨). 같은 위치에 측정점이 여러 개면 **평균**
- `run_id`: 데모용 단순 정수 (1, 2, 3 …), CSV 내용에서 읽는다. run_id 는 탭(시험)마다 따로
- `dx_mm` 부호: **+ 가 후방(탑승자 쪽)**. MO 2.0 의 "X 가 전방이면 Y-Z" 규칙은 `dx_mm < 0` 으로 판단
- 측정위치 → location_key 매핑과 값 계산 (`PROTOCOLS` 의 `csv`, `calc` 로 둬서 수정 쉽게):

| CSV `location` | 운전석 | 조수석 | MO 2.0 |
|---|---|---|---|
| Lower_Hinge_Pillar | 3점 `resultant_mm` 평균 | 3점 `resultant_mm` 평균 | – |
| Upper_Hinge_Pillar | 3점 `resultant_mm` 평균 | 3점 `resultant_mm` 평균 | – |
| Rocker_Panel | 3점 `dy_mm` 평균 | 3점 `dy_mm` 평균 | – |
| Footrest | `resultant_mm` | `resultant_mm` | X-Y-Z (X 전방이면 Y-Z) |
| Left_Toepan | `resultant_mm` | – | X-Y-Z (X 전방이면 Y-Z) |
| Center_Toepan | – | `resultant_mm` | X-Y-Z (X 전방이면 Y-Z) |
| Right_Toepan | – | `resultant_mm` | X-Y-Z (X 전방이면 Y-Z) |
| Brake_Pedal | `resultant_mm` | – | X-Y-Z (X 전방이면 Y-Z) |
| Parking_Brake_Pedal | `resultant_mm` | – | – |
| Steering_Column | `dx_mm` | – | – |
| Upper_Dash | `resultant_mm` | `resultant_mm` | – |
| Center_Dash | – | `resultant_mm` | – |
| Right_Lower_Dash | – | `resultant_mm` | – |
| Left_Instrument_Panel | `resultant_mm` | – | `dx_mm` (후방 X) |
| Right_Instrument_Panel | – | – | `dx_mm` (후방 X) |
| Door_Opening | – | – | `resultant_mm` (문 개구부 변형량을 이 컬럼에 넣는 것으로 가정, 확인 필요) |

## 차기 단계 (지금 구현하지 않음)
- "Good 까지 몇 mm" 목표 분석, 기준 run 대비 변화량(Δ), 위치별 run 추이 차트
- Small overlap 종합 (운전석·조수석 중 낮은 등급) 보기
- 사내 적용: Google Apps Script 웹앱 + Google Sheet 저장
- 자동화: 해석 결과 폴더에서 CSV 자동 수집 → Drive 업로드
