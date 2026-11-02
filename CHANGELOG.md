# 변경 이력

버전별 완성본은 `releases/<버전>/index.html` 에 그대로 보관한다 (파일 하나만 열면 실행됨).
루트의 `index.html` 은 항상 개발 중인 최신 버전이다.

## v2.0 (계획)
- 우측 패널에 Gemini 채팅: 현재 선택한 run 데이터·판정 결과를 같이 보며 분석

## v1.3 — 2026-10-31 (검토 중, 확정 후 releases/v1.3 에 보관)
- 상단 기능 탭 추가: **Intrusion 뷰어 / DOE 분석** (한 앱으로 통합)
- DOE 분석 3단계
  - 실험 설계: 직교배열 10종 (L4~L32, L18 포함) · D-최적 (좌표 교환법) · 완전요인, 자동 추천, 교호작용 선택, CSV·엑셀 복사
  - 결과 입력 · ANOVA: 엑셀 붙여넣기, Intrusion 뷰어 run 에서 가져오기 (run 번호 = run_id), ANOVA 표 · 기여율 · 주효과 그래프 · 자동/수동 풀링 · 쉬운 말 요약
  - 최적화: 컨트롤 팩터 선택 (나머지 고정), 작게/크게/목표값, 다른 반응 조건, 예측 ± 95% 신뢰구간, 상위 5개 후보
- 예제 프로젝트, 저장·열기 (.json), 브라우저 자동 저장
- 테스트: `tests/doe.test.js`

## v1.2 — 2026-10-27
- 시험 3종 탭: Small overlap 운전석 / Small overlap 조수석 / Moderate overlap 2.0 (구조 판정만)
  - 조수석: Small Overlap Rating Protocol VII Appendix Figure A-4 기준, Lower / Upper 서브레이팅
  - MO 2.0: Rating Guidelines Version III Figure 7 기준, 구조 단일 판정, Y-Z·후방 X 성분 규칙
- CSV 측정위치 이름으로 시험을 자동 판별해 해당 탭에 넣음 (세 시험이 섞인 폴더도 한 번에)
- 탭마다 run 목록·표·그래프 상태 따로, 탭 아래에 판정 기준 문서 표시
- 데모 데이터 폴더 정리: `samples/small_overlap_driver/` (기존 `samples/runs/`), `samples/small_overlap_passenger/`, `samples/moderate_overlap_2/`

## v1.1 — 2026-10-19
- 폴더 불러오기: `<run 폴더>/<서브폴더>/results.csv` 구조를 폴더째 선택·드롭하면 모두 불러옴, run 이름은 run 폴더명
- 표: 불러온 run 전부를 열로 표시 (개수 제한 없음), run별 표 ON/OFF, 전체 켜기·끄기·삭제, 첫 열 고정
- 그래프: 표 열 머리에서 최대 3개 선택, 색·무늬는 칸 위치로 고정
- 판정 결과를 표 맨 아래 줄로 추가, 카드는 그래프에 그린 run만
- 표 값 셀 바탕색으로 등급 표시 (Good 그린, Acceptable 옐로우, Marginal 레드, Poor 진한 레드), G/A/M 글자 표시 제거
- 같은 run_id 교체 알림을 한 번에 묶어서 표시
- 데모 데이터: `samples/runs/` 10개 run 폴더

## v1.0 — 2026-10-10
- 로컬 MVP: CSV 불러오기(다중, 드래그 앤 드롭), 같은 run_id 교체 알림
- IIHS Small Overlap (Protocol VII) 판정 카드, 판정구간 차트, 측정값 표 (단위 mm)
- 판정·파싱 테스트: `node tests/rating.test.js`
