# CLAUDE.md — 충돌해석 Intrusion 뷰어 (로컬 MVP)

## 목표
개인 PC에서 META가 출력한 run별 CSV를 불러오면, 한 화면에 **측정값 표 + IIHS 판정구간 차트 + 판정 결과**가 나오는 앱을 만든다.
자동 수집, 클라우드 저장은 이번 범위가 아니다. 나중에 사내 시스템(Google Apps Script 웹앱)으로 옮길 예정이므로 그 전환이 쉽게 만든다.

## 기술 방침
- **단일 HTML 파일** (`index.html`): HTML + CSS + vanilla JS, 외부 라이브러리 없음, 빌드 도구 없음
- 브라우저로 파일을 열면 바로 동작해야 한다 (서버 불필요)
- CSV는 **폴더 선택** / 파일 선택 버튼 또는 드래그 앤 드롭(폴더 포함)으로 여러 개 불러온다 (파일 1개 = run 1개)
- 해석 결과 폴더 구조: `<run 폴더>/<서브폴더>/results.csv`. 폴더를 불러오면 하위의 `results.csv`만 모두 읽고, run 이름은 run 폴더 이름에서 가져온다 (서브폴더 이름은 상관없음)
- 차트는 SVG로 직접 그린다
- **출발점: `docs/mockup/intrusion_chart_mockup.html`** — 차트 렌더링과 판정 로직이 이미 구현되어 있고, 샘플 데이터 대신 CSV 데이터를 넣으면 된다

## 화면 구성
1. 불러오기 영역: 폴더 선택 / CSV 파일 선택 / 드래그 앤 드롭
2. run 목록: run마다 **표 ON/OFF** 체크, 개별 삭제, 표 전체 켜기·끄기, 전체 삭제
3. 판정 카드: **그래프에 그린 run만** Lower / Upper / 종합
4. 차트: 판정구간 배경 + 측정위치별 막대. **표에서 선택한 run을 최대 3개** 그린다 (그룹 막대, 1개면 값 표시)
   - 색·무늬는 그래프 칸(1·2·3번째) 위치로 고정 → 다른 run을 빼도 색이 바뀌지 않음
   - 4번째 선택은 막고 알림. 표에서 끈 run은 그래프에서도 빠짐
   - 새로 불러온 run은 그래프 빈 칸이 있으면 run_id 순으로 자동 선택
5. 표: 행 = 측정위치, 열 = 표 ON 인 run 전부 (개수 제한 없음, 가로 스크롤 시 첫 열 고정)
   - 셀은 값(mm), 바탕색으로 등급 표시 (Good 그린 / Acceptable 옐로우 / Marginal 레드 / Poor 진한 레드), 열 머리에 "그래프" 체크, 맨 아래 Lower / Upper / 종합 판정 줄

## 코드 구조
기능별로 분리해 나중에 Apps Script로 옮기기 쉽게 한다.
- `PROTOCOL` 설정 객체: 측정위치, 그룹, 기준값 (아래 표)
- `parseCsv(text, fileName)` → `{ runId, name, values: { location_key: value_mm } }`
- `rateRun(run)` → `{ lower, upper, overall }` (순수 함수, DOM 접근 금지)
- `renderChart(runs)`, `renderTable(runs)`, `renderCards(runs)`
- 파일 읽기(FileReader)는 데이터 로드 부분에만 둔다 → 나중에 `google.script.run`으로 교체할 자리

## IIHS Small Overlap 판정 규칙 (Protocol VII, April 2024, 단위 mm)

앱 전체(입력·기준값·차트·표)는 **mm 단위**로 통일한다. 기준값은 IIHS 원문(cm)을 ×10 한 값이다.

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

- Marginal 상한 초과 → Poor. 경계값은 더 좋은 등급 (`value <= 상한`)
- 서브레이팅(lower, upper 각각): 가장 많은 측정값이 속한 구간, 동률이면 더 나쁜 구간
- 단, 그룹 내 최악 측정값보다 한 단계 넘게 좋을 수 없음
- 종합 = lower / upper 중 나쁜 쪽
- 범위 밖: 정성 관찰에 의한 하향, 다중 시험 평균

## 테스트
- `rateRun`은 경계값, 동률, 최악값 제한 케이스를 확인하는 테스트를 둔다 (`tests/rating.test.html` 또는 Node로 실행 가능한 형태)
  - 실행: `node tests/rating.test.js` (index.html 의 `@core-start` ~ `@core-end` 구간을 읽어 테스트)
- `samples/`에 실제 CSV 샘플을 두고 파싱 결과를 확인한다
  - `samples/R00x_*.csv`: 낱개 CSV 3개
  - `samples/runs/R0xx_*/output/results.csv`: 데모용 run 폴더 10개 (run 1~3은 낱개 CSV와 같은 값, run 8은 Poor 포함)

## CSV 포맷 (확정)

예시: `samples/R001_baseline.csv`

```
run_id,location,point,dx_mm,dy_mm,dz_mm,resultant_mm
1,Lower_Hinge_Pillar,1,66.39,22.63,27.78,75.44
```

- 파일 1개 = run 1개. 단위 mm, 측정점(`point`)은 원시값 그대로 들어 있다 (집계 안 됨)
- `run_id`: 데모용 단순 정수 (1, 2, 3 …), CSV 내용에서 읽는다
- 측정위치 → location_key 매핑과 값 계산 (매핑 테이블로 둬서 수정 쉽게):

| CSV `location` | location_key | 계산 |
|---|---|---|
| Lower_Hinge_Pillar | lower_hinge_pillar | 3점 `resultant_mm` **평균** |
| Footrest | footrest | `resultant_mm` |
| Left_Toepan | left_toepan | `resultant_mm` |
| Brake_Pedal | brake_pedal | `resultant_mm` |
| Parking_Brake_Pedal | parking_brake | `resultant_mm` |
| Rocker_Panel | rocker_lat | 3점 `dy_mm` **평균** (Y 성분) |
| Steering_Column | steering_long | `dx_mm` (X 성분) |
| Upper_Hinge_Pillar | upper_hinge_pillar | 3점 `resultant_mm` **평균** |
| Upper_Dash | upper_dash | `resultant_mm` |
| Left_Instrument_Panel | left_ip | `resultant_mm` |

## 차기 단계 (지금 구현하지 않음)
- 사내 적용: Google Apps Script 웹앱 + Google Sheet 저장
- 자동화: 해석 결과 폴더에서 CSV 자동 수집 → Drive 업로드
- 기준 run 대비 변화량(Δ), 위치별 run 추이 차트
