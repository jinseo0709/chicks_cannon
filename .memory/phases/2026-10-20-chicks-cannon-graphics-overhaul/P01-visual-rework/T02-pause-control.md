# Task: T02 일시정지 및 재개 흐름

## Status: done

## Goal
플레이 도중 물리 업데이트와 Canvas 장면 시계를 일시정지하고, 같은 상태로 재개하거나 현재 챕터를 재시작할 수 있도록 한다.

## Decision Summary
- `GameState`에 `PAUSED`를 추가하고 pause 직전의 활성 state를 보관한다. 물리 바디, 탄약, 점수, 엔티티는 pause/resume 사이에 변경하지 않는다.
- `requestAnimationFrame`은 계속 실행해 화면을 유지하되 pause 상태에서 엔진 `step`을 생략하고 renderer에 전달하는 장면 시각을 고정한다.

## Implementation

### I01. 엔진/컨트롤러 일시정지 상태
- Related Files:
  - `apps/web/src/game/types.ts` :: `GameState`, `GameSnapshot` — pause state 타입; modify
  - `apps/web/src/game/engine.ts` :: `ChickCannonEngine.pause`, `resume`, `step`, `loadStage`, input/action methods — 상태 전이; modify
  - `apps/web/src/game/use-chick-cannon.ts` :: `ChickCannonController`, RAF `animate`, callbacks — renderer 시계 및 public actions; modify
  - `apps/web/src/game/engine.test.ts` :: pause/resume 상태 테스트; modify

#### Details
- `GameState`에 `'PAUSED'`를 추가한다. snapshot에는 별도 boolean을 추가하지 않고 `state`만으로 pause 여부를 나타낸다.
- Engine에 `private stateBeforePause: 'AIMING' | 'FLYING' | 'RESOLVING' | null = null`을 둔다. `pause(): void`는 현재 state가 이 3개 중 하나일 때만 원래 state를 기록하고 `PAUSED`로 바꿔 publish한다. `resume(): void`는 `PAUSED`이고 저장 state가 있을 때만 원래 state로 복원하고 저장값을 비운 뒤 publish한다.
- `step(deltaMs)`는 `!alive || state === 'PAUSED'`이면 물리·settlement·score 업데이트 없이 return한다. pause 전후에도 `Composite`와 `activeChick`를 수정하지 않는다.
- `setAim`, `releaseAim`, `activateSkill`, `useItem`은 기존 state guard에 따라 PAUSED에서 아무 동작도 하지 않는다. `retryStage/loadStage`는 `stateBeforePause`를 null로 초기화해 재시작 직후 pause가 잔류하지 않게 한다.
- `ChickCannonController`에 `togglePause(): void`를 추가한다. 현재 state가 PAUSED면 engine.resume(), 아니면 engine.pause()를 호출한다.
- RAF `animate(time)` 안에서 `sceneTime`을 별도 지역 변수로 보유한다. 현재 snapshot state가 PAUSED가 아니면 `sceneTime = time`으로 갱신하고, PAUSED면 마지막 값을 유지한다. renderer 호출은 `renderer.render(current, sceneTime)`으로 바꾼다. RAF는 계속 예약해 HUD와 overlay는 표시한다.
- Tests: AIMING/FLYING/RESOLVING에서 pause-resume 후 원상태 복원; PAUSED 중 `step`이 위치/점수를 바꾸지 않음; PAUSED 중 aim/fire/skill/item 입력 무시; restart 후 PAUSED state 해제.

### I02. 일시정지 UI
- Related Files:
  - `apps/web/src/components/GameHud.tsx` :: `GameHudProps`, `GameHud` — pause/resume control; modify
  - `apps/web/src/components/PausePanel.tsx` :: `PausePanel` — resume/restart overlay; new
  - `apps/web/src/App.tsx` :: `App` — pause panel 연결; modify
  - `apps/web/src/styles.css` :: `.pause-panel`/button styles — overlay; modify
  - `apps/web/src/components/GameHud.test.tsx` :: pause action; modify
  - `apps/web/src/components/PausePanel.test.tsx` :: accessible actions; new

#### Details
- `GameHudProps`에 `onTogglePause(): void`을 추가한다. `GameHud`는 `AIMING`, `FLYING`, `RESOLVING`, `PAUSED`에서 조작 가능한 pause/resume 버튼을 렌더하고 `snapshot.state === 'PAUSED'`일 때 aria-label을 `재개`로 한다.
- `PausePanel` signature: `interface PausePanelProps { onResume(): void; onRestart(): void }`; `function PausePanel(props: PausePanelProps): JSX.Element`. App은 `snapshot.state === 'PAUSED'`일 때 dialog overlay를 표시한다. 버튼은 `계속하기`와 `현재 챕터 다시 시작`으로 구분하며 둘 다 keyboard-focusable, `role="dialog"`, `aria-modal="true"`, accessible heading이 있어야 한다.
- `App`에서 `onResume`은 controller.togglePause, `onRestart`는 controller.retryStage에 연결한다. 기존 GameModal의 LOST/EVOLUTION/ENDING 흐름은 변경하지 않는다.
- CSS overlay는 게임 frame 안에서 가운데 표시하고, 버튼은 기존 `.button` visual tokens를 재사용한다. Canvas는 background drawing을 계속하지만 `sceneTime` 고정으로 현재 frame을 유지한다.

## Acceptance Criteria
- [ ] pause는 AIMING/FLYING/RESOLVING에서만 작동하고 원래 state를 저장한다.
- [ ] pause 동안 물리, 조준, 발사, 스킬/아이템 입력이 진행되지 않는다.
- [ ] 재개는 같은 게임 상태를 복원하고 재시작은 현재 챕터를 초기화한다.
- [ ] 화면에 접근성 있는 pause panel과 pause/resume 버튼이 표시된다.
- [ ] 다음 Task에서 구현할 배경 애니메이션도 pause 상태에서 고정할 수 있도록 RAF sceneTime이 정지한다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/engine.test.ts src/components/GameHud.test.tsx src/components/PausePanel.test.tsx` — pause and UI tests pass.
- `npm.cmd run build --workspace @chicks-cannon/web` — TypeScript and Vite production build pass.
- `git diff --check` — whitespace checks pass.

## Commit Message
```text
feat(game): add pause and resume controls

Plan: 2026-10-20-chicks-cannon-graphics-overhaul
Phase: P01-visual-rework
Task: T02-pause-control

- Freeze simulation and scene time while paused
- Add accessible resume and current-stage restart panel
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
