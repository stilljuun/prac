# 변경 이력

버전별 완성본은 `releases/<버전>/index.html` 에 그대로 보관한다 (파일 하나만 열면 실행됨).
루트의 `index.html` 은 항상 개발 중인 최신 버전이다.

## v2.0 (계획)
- 우측 패널에 Gemini 채팅: 현재 선택한 run 데이터·판정 결과를 같이 보며 분석

## v1.0 — 2026-10-10
- 로컬 MVP: CSV 불러오기(다중, 드래그 앤 드롭), 같은 run_id 교체 알림
- IIHS Small Overlap (Protocol VII) 판정 카드, 판정구간 차트, 측정값 표 (단위 mm)
- 판정·파싱 테스트: `node tests/rating.test.js`
