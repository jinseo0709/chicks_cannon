# 보너스 도전과 대체 공략 경로

## Phase 01: 시간 도전과 두 갈래 구조

### T01 두 갈래 약점 구조와 경로 안내
- `apps/web/src/game/types.ts`, `stages.ts`에서 스테이지별 두 공략 경로 힌트를 정의한다.
- 여섯 스테이지의 구조물에 낮은 지지대 경로와 높은 측면·기믹 경로가 모두 드러나게 배치한다.
- 시작 대화에서 두 약점 힌트를 짧게 안내한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- stages.test.ts DialoguePanel.test.tsx` 및 웹 빌드
- 커밋: `레벨: 두 갈래 약점 경로와 스테이지 힌트 추가`
- Status: done

### T02 선택형 시간 보너스 도전
- 시작 대화를 닫은 시점부터 시간 도전을 시작하고, 일시정지 중에는 시간을 멈춘다.
- 시간 초과는 실패로 처리하지 않는다. 제한 시간 안에 클리어하면 추가 점수와 스테이지 전용 배지를 준다.
- HUD 타이머와 성공·시간 초과 상태, 클리어 배지를 보여주고 기존 별점 계산은 유지한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- engine.test.ts GameHud.test.tsx GameModal.test.tsx` 및 웹 빌드
- 커밋: `게임플레이: 선택형 시간 보너스 도전과 클리어 배지 추가`
- Status: pending

## 실행 규칙
- 각 Task의 검증이 통과한 뒤 지정된 한국어 커밋을 만들고 다음 Task로 진행한다.
- 검증 실패를 해결하지 못하면 해당 Task에서 멈추고 원인과 결과를 보고한다.
