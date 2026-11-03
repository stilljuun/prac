# Claude Code 스킬 (프로젝트 설치)

이 폴더의 스킬은 저장소에 같이 들어 있어서, 이 프로젝트를 여는 Claude Code 세션(로컬 · 클라우드)이면 따로 설치하지 않아도 바로 쓸 수 있다.

## 설치한 것

| 스킬 | 쓰는 법 | 하는 일 |
|---|---|---|
| `impeccable` | `/impeccable audit`, `/impeccable critique`, `/impeccable polish`, `/impeccable clarify`, `/impeccable harden` 등 (인자 없이 `/impeccable` 이면 메뉴) | 화면 디자인 · UX 점검과 수정. 이 도구는 "Operate" 모드(작업용 UI)로 다뤄서, 화려함보다 읽기 쉬움 · 일관성을 우선한다. 제품 정보는 루트 `PRODUCT.md` 를 읽는다 |
| `ponytail` | `/ponytail` (`lite` · `full` · `ultra` · `off`) | 가장 작은 변경으로 푸는 코딩 모드. 이미 있는 코드 → 브라우저 기본 기능 → 최소 코드 순서로 고른다 (외부 라이브러리 금지 원칙과 맞음) |
| `ponytail-review` | `/ponytail-review` (`uncommitted`, `staged`, `branch` 등) | 변경분 리뷰: 버그 · 보안 · 테스트 누락 · 속도 · 줄일 코드. 결과는 한국어로 |
| `ponytail-audit` | `/ponytail-audit` | 저장소 전체를 같은 기준으로 점검해 중요한 순서로 보고 (코드는 안 바꿈) |
| `ponytail-debt` | `/ponytail-debt` | 코드의 `shortcut:` 주석(일부러 미룬 일)을 목록으로 모음 |

`.claude/agents/impeccable-*.md` 4개는 impeccable 이 필요할 때 부르는 보조 에이전트다.

### impeccable 실행 파일

`.claude/skills/impeccable/scripts/impeccable` (Windows: `impeccable.cmd`) 는 런처 스크립트다. 처음 실행할 때 GitHub 릴리스(`pbakaus/impeccable`)에서 검사 엔진을 내려받고, `scripts/engine-checksums.txt` 의 SHA-256 과 맞을 때만 실행한다. 엔진은 사용자 캐시 폴더에 저장되고 저장소에는 들어가지 않는다. 네트워크가 막혀 엔진을 못 받으면 스킬은 파일을 직접 읽는 방식으로 계속 동작한다.

자동 훅(파일을 고칠 때마다 디자인 검사)은 **켜지 않았다**. 판정 로직 · DOE 수식 작업 중에 디자인 경고가 끼어들지 않게 하려는 것이다. 필요하면 화면 작업 뒤에 직접 돌린다:

```
sh .claude/skills/impeccable/scripts/impeccable detect index.html
```

## 출처 · 버전

| 스킬 | 저장소 | 커밋 | 라이선스 |
|---|---|---|---|
| impeccable 4.8.0 (엔진 0.1.18) | github.com/pbakaus/impeccable (`.claude/skills/impeccable`, `.claude/agents`) | `9fadc41` (2026-11-02) | Apache-2.0, `licenses/impeccable-LICENSE`, `licenses/impeccable-NOTICE.md` |
| ponytail 5.3.3 | github.com/DietrichGebert/ponytail (`skills/`) | `96608e0` (2026-10-29) | MIT, `licenses/ponytail-LICENSE` |

### 원본과 다른 점

- `ponytail-review`, `ponytail-audit`: 결과를 "Very simple English" 대신 사용자 언어(한국어)로 쓰도록 출력 언어 문장만 고침.
- ponytail 의 플러그인 전용 부분(세션 시작 훅, 상단 band · board, 사용량 기록 · 웹훅, `ponytail-help`, `ponytail-gain`)은 넣지 않음. 그래서 ponytail 은 항상 켜져 있지 않고, `/ponytail` 로 부르거나 코딩 작업에서 Claude 가 필요하다고 판단할 때 동작한다.
- impeccable 은 프로젝트 설치본을 그대로 복사 (공식 설치기 `npx impeccable install` 은 클라우드 환경에서 impeccable.style 접속이 막혀 쓰지 못함).

## 업데이트

같은 경로의 파일을 원본 저장소의 새 커밋으로 덮어쓰고 위 표의 커밋을 고친다. ponytail 의 출력 언어 수정은 다시 적용한다. 로컬 PC 에서는 공식 설치기도 쓸 수 있다:

```
npx impeccable install --project --providers=claude --no-hooks --force
```

## 검토했지만 넣지 않은 것

| 저장소 | 이유 |
|---|---|
| Leonxlnx/taste-skill | 디자인 스킬이 impeccable 과 겹침. 랜딩 페이지 · 마케팅 화면 쪽에 맞춰져 있음 |
| affaan-m/ECC | 스킬 314개 · 에이전트 71개 묶음. 대부분 이 프로젝트와 무관하고, 필요한 부분(리뷰 · 접근성)은 위 스킬과 겹침 |
| TerryFYL/claude-statistical-analysis-skill | 설문 · 사회과학용 통계 상담 스킬 (APA 표, 논문 문단, SEM · HLM). DOE 의 직교배열 · 풀링 · 기여율 · 최적화를 다루지 않고, 반복 없는 해석 결과에 정규성 검정 · 비모수 전환을 적용해 맞지 않음. "ANOVA" · CSV 언급만으로 켜져 앱 코드 작업을 Python 분석으로 돌릴 위험 |
| cloudflare/security-audit-skill | 서버 · 다중 사용자 서비스용 대규모 보안 감사. 로컬 단일 HTML 도구에는 과함 (기본 `/security-review` 로 충분). Apps Script 웹앱으로 옮길 때 다시 검토 |
| heygen-com/hyperframes | HTML → 동영상 렌더링 |
| debpalash/VoiceStudio | AI 음성 앱 |
| Panniantong/Agent-Reach | SNS · 중국 플랫폼 수집 도구 |
| NationalSecurityAgency/ghidra | 바이너리 리버스 엔지니어링 |
| tashfeenahmed/freellmapi | 무료 LLM API 중계 서버 |
| deepseek-ai/DeepInfer | 대규모 LLM 추론 서버 (GPU) |
