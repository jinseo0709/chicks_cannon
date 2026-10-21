# Plan: 병아리 대포 6단계 여정·타격감·캐릭터 전면 개선

## Goal
확정된 [결정 문서](../decisions/2026-10-21-chicks-cannon-six-levels-and-feedback.md)를 바탕으로 상·하단 HUD 분리, 버터 스프레이, 6단계 순차 여정, 실제 장애물 물리, 귀여운 Canvas 캐릭터, 타격 이펙트·오디오를 완성한다. 320px·390px·데스크톱에서 UI 겹침이 없고, 아이템 없이도 각 레벨을 공략할 수 있으며, 6단계에서만 엔딩·점수 제출이 열려야 한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 게임 물리·6단계 데이터·HUD·이펙트·그래픽·여정 지도·실제 브라우저 검증 | [P01](../phases/2026-10-21-chicks-cannon-six-levels-and-feedback/P01-campaign-and-game-feel/phase.md) |

## Task Roadmap
| Task | Observable outcome | Main files |
| :--- | :--- | :--- |
| T01 | 타이어 반사·톱니 밀침·낙하 샹들리에·방패 계층·TNT 연쇄가 실제 물리에서 동작 | `types.ts`, `engine.ts`, `engine-gimmicks.test.ts` |
| T02 | 6단계 배치와 4종 성장 형태를 분리하고 스킬·엔딩·에셋 매핑까지 확장 | `stages.ts`, `constants.ts`, `engine.ts`, `asset-cache.ts`, `renderer.ts` |
| T03 | 상단 정보/하단 4종 도크 분리와 버터 지정·취소·마찰 효과를 끝까지 연결 | `GameHud.tsx`, `styles.css`, `engine.ts`, `pointer-input.ts`, `use-chick-cannon.ts` |
| T04 | 단발 타격 이벤트·60ms 히트 스톱·150ms 흔들림·야옹 오디오·일시정지 시간 일관성 | `types.ts`, `engine.ts`, `audio.ts`, `use-chick-cannon.ts` |
| T05 | Canvas 캐릭터 상태 애니메이션과 별·먼지·텍스트·처치 퇴장 연출 | `character-renderer.ts`, `impact-renderer.ts`, `renderer.ts`, `asset-cache.ts` |
| T06 | 여섯 정적 테마 배경과 환풍구·타이어·톱니·샹들리에·블록의 카툰 디테일 | `renderer.ts`, `renderer.test.ts` |
| T07 | 6개 진행 지도와 중복 진화 없는 레벨 전환·보호 대상 안내 | `JourneyMap.tsx`, `HomeScreen.tsx`, `DialoguePanel.tsx`, `GameModal.tsx`, `App.tsx` |
| T08 | 아이템 없는 실제 물리 해법과 3개 화면 크기의 브라우저 검증·스크린샷·통합 보고 | `campaign-playthrough.test.ts`, `e2e/`, Playwright 설정, 검증 보고서 |

## Architecture and Task Boundaries
- 단일 React/Canvas 게임 도메인이고 외부 API 변경이 없어 Phase는 하나로 둔다. 8개 Task는 구현 변경이 아닌 검증 가능한 기능 경계다.
- T01에서 새 물리를 먼저 추가하고 기존 네 레벨은 그대로 유지한다. T02가 이 기능을 쓰는 최종 여섯 레벨을 넣는다. 이후 Task를 먼저 읽지 않아도 각 청사진에 입력 모델·선행 산출물·기본값·검증이 들어 있다.
- T03는 버터 타입·물리·입력·버튼·CSS를 함께 바꾼다. 타입만 먼저 추가하면 모든 ItemCounts 초기값이 깨지고, 물리만 넣으면 사용자가 지정할 방법이 없기 때문이다.
- T04는 물리의 이벤트와 시계를 완성하고 T05는 이를 그린다. 처치한 물리 본체를 렌더 연출 때문에 계속 살려두지 않는다.
- T02에서 기존 SVG 네 형태를 6단계에 안전하게 매핑하고, T05에서 새 Canvas 캐릭터를 실제 기본 경로로 전환한다. T06 전에도 새 레벨이 빈 배경이 되지 않게 T02에서 임시 테마 재사용 매핑을 명시한다.
- 실행 시 Task별 지정 검증을 통과하고 지정 메시지로 커밋한다. 실패하면 같은 Task에서 원인을 보고하며 다음 포인터로 넘어가지 않는다. 기존 미추적 파일을 일괄 스테이징하지 않는다.

## Validation Gates
1. T01~T07: 각 Task의 물리/컴포넌트/렌더러 테스트와 웹 빌드, `git diff --check`.
2. T08: 여섯 레벨을 실제 샷·스킬로 통과하는 고정 회귀 해법, 전체 워크스페이스 테스트, 전체 빌드.
3. 실제 Chromium에서 320×740, 390×844, 1440×900을 확인한다. JSDOM 테스트만으로 CSS 겹침·화면 품질을 통과 처리하지 않는다. 현재 저장소에는 브라우저 자동화 의존성이 없으므로 T08에서 개발 의존성과 Chromium을 준비한다. 설치가 실패하면 해당 Task를 실패/미검증으로 보고한다.
4. 브라우저 스크린샷은 `.memory/reports/2026-10-21-chicks-cannon-six-levels-and-feedback/`에 기록한다. 개발용 장면 하네스는 production entry에 포함하지 않는다.

## Scope and Existing Findings
- 기존 API/DB 및 랭킹 정책은 변경하지 않는다. 6단계 클리어 여부는 프런트에서 기존 `campaignCompleted`로 제출한다.
- 기존 재시도 점수 유지 정책은 반복 누적 가능성이 있다. 이번 계획에는 랭킹 공정성 정책 변경을 포함하지 않았다.
- 이 계획 단계에서는 `.memory/` 문서만 작성한다. 테스트 실행·의존성 설치·구현·커밋은 실행 단계의 작업이다.

## Progress
- done: 2/8 (active: P01-T03)
