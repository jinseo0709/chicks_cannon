# Task: T03 단일 상단 Flexbox HUD

## Status: done

## Goal
분리된 챕터 카드·탄환 카드·하단 아이템 트레이를 하나의 상단 바 안에 정렬한다. 챕터/점수/탄환, 아이템 3개, 사운드/일시정지/재시작이 데스크톱과 모바일에서 겹치지 않도록 한다.

## Decision Summary
- 데스크톱 상단 바는 `display:flex; justify-content:space-between; align-items:center; width:100%; padding:12px 20px`를 사용한다.
- 모바일은 같은 한 줄을 유지하고 item label만 숨긴다. 각 버튼에는 보이는 글자와 별개로 고정 `aria-label`과 남은 수량을 제공한다.

## Implementation

### I01. 좌/중/우 그룹 DOM 및 접근성
- Related Files:
  - `apps/web/src/components/GameHud.tsx` :: `GameHud`, `GameHudProps` — single bar groups and controls; modify
  - `apps/web/src/components/GameHud.test.tsx` :: `GameHud` — layout order, content and actions; modify

#### Details
- **Signatures & Types**:
  ```ts
  export interface GameHudProps {
    snapshot: GameSnapshot;
    onRestart(): void;
    onMute(): void;
    onUseItem(kind: ItemKind): void;
    onTogglePause(): void;
  }
  export function GameHud(props: GameHudProps): JSX.Element;
  ```
- `.hud-topline` direct children는 정확히 `.hud-left`, `.item-tray`, `.hud-actions` 순서다. `.hud-left`에는 현재 `.chapter-card`와 `.ammo-card`를 묶고, `.item-tray`에는 기존 3 item button과 기존 disabled/action logic을 그대로 둔다. `.hud-actions`에는 현재 mute, active/paused에 따른 pause/resume, restart 버튼을 둔다.
- 각 item button은 `aria-label="치즈 로켓, 남은 {count}개"`, `aria-label="달걀 지진, 남은 {count}개"`, `aria-label="거대화, 남은 {count}개"` 형식을 사용한다. 아이콘은 `aria-hidden=true`; 텍스트 label에는 `.item-label` class를 추가한다. 모바일에서 label CSS를 숨겨도 접근성 이름을 잃지 않는다.
- 탄환 aria-label, 점수 텍스트, 수량 badge, mute/pause/restart aria-label, `onUseItem`, `onTogglePause` 동작을 보존한다.

### I02. Flexbox 및 좁은 화면 CSS
- Related Files:
  - `apps/web/src/styles.css` :: `.hud-topline`, `.hud-left`, `.hud-card`, `.hud-actions`, `.item-tray`, `.item-button`, `@media (max-width: 560px)` — single-row layout; modify

#### Details
- `.hud-topline`에 `display:flex; justify-content:space-between; align-items:center; width:100%; padding:12px 20px; gap:12px;`를 둔다. `.hud-left`와 `.hud-actions`는 `display:flex; align-items:center; gap` 값으로 내용만큼 공간을 사용한다. `.item-tray`는 `position:static; flex:1 1 auto; display:flex; justify-content:center; flex-wrap:nowrap;`이며 이전 absolute bottom/left를 제거한다.
- 데스크톱 item button은 label과 badge를 한 줄로 표시하고 가능한 한 축소되지 않게 한다. 긴 제목/점수는 box 내부에서 서로 겹치지 않게 `.chapter-card`의 grid/line-height와 min-width를 지정한다.
- 560px 이하에서 `.hud-topline` padding은 `6px 8px`; `.hud-left`, `.item-tray`, `.hud-actions` gap은 3~4px로 줄인다. `.item-label`은 display:none; item buttons는 아이콘과 badge만 남기고 각 그룹은 `min-width:0`으로 줄어들 수 있게 한다. `.icon-button`은 최소 30px hit target을 유지하고 우측 세 개가 수평 정렬된다. 세 그룹이 viewport보다 넓어지는 경우를 막기 위해 item/action button width와 padding을 명시적으로 줄인다. 320px 및 390px CSS viewport에서 한 줄이고 horizontal overflow가 없어야 한다.
- 높은 대비를 유지하고 기존 `pointer-events:none`인 `.game-hud`에서 버튼 그룹만 `pointer-events:auto`가 되게 한다. Canvas input z-index/레이아웃을 변경하지 않는다.

### I03. HUD regression tests
- Related Files:
  - `apps/web/src/components/GameHud.test.tsx` :: `GameHud` tests — modify

#### Details
- 세 영역의 DOM order/class를 확인하고 아이템 3종 이름과 count, ammo/score, sound/pause/restart accessible name을 검증한다.
- 세 아이템 callbacks와 pause/mute/restart callbacks가 기존대로 호출되고 disable conditions가 바뀌지 않는지 검증한다.
- computed style library를 추가하지 않는다. layout CSS는 production stylesheet를 확인하고 `git diff --check`를 실행한다.

## Acceptance Criteria
- [x] 데스크톱의 상단 HUD가 좌측 정보, 중앙 가로 아이템 3개, 우측 버튼 3개의 단일 Bar다.
- [x] 챕터/점수/탄환이 좌측 그룹에 있고 텍스트가 겹치지 않는다.
- [x] 320px/390px 모바일에서도 모든 조작이 한 줄에 보이고 item label 숨김 후에도 접근 가능한 이름이 남는다.
- [x] 기존 아이템 사용/비활성, 소리, pause, restart 동작이 보존된다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/components/GameHud.test.tsx` — HUD content, accessibility and action tests pass.
- `npm.cmd run build --workspace @chicks-cannon/web` — TypeScript and Vite production build pass.
- `npm.cmd test` — all existing workspace tests pass.
- `git diff --check` — whitespace checks pass.

## Commit Message
```text
feat(ui): consolidate game controls into top bar

Plan: 2026-10-20-chicks-cannon-scene-redesign
Phase: P01-static-scenes-and-hud
Task: T03-top-hud

- Align chapter info, items and controls in one responsive row
- Keep controls accessible when mobile labels are hidden
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
