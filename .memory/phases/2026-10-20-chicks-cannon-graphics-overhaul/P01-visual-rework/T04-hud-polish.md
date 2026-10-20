# Task: T04 팝 아트 HUD 및 둥근 게임 폰트

## Status: done

## Goal
아이템 3개를 화면 왼쪽 아래에 두고, 아이템/상태창을 고대비 외곽선과 하단 두께가 있는 팝 아트풍으로 다듬는다. Jua 폰트를 로컬 dependency로 포함해 한글 UI가 기기마다 일관되게 보이게 한다.

## Decision Summary
- 아이템 동작과 사용 조건은 유지한다. 시각 배치만 left-bottom으로 바꾸고 모바일에서도 세 버튼을 가리지 않게 유지한다.
- `@fontsource/jua`를 production dependency로 추가하고 Vite가 폰트 파일을 번들하도록 한다. Google Fonts 런타임 요청을 추가하지 않는다.

## Implementation

### I01. HUD 배치와 팝 아트 시각 스타일
- Related Files:
  - `apps/web/src/components/GameHud.tsx` :: `GameHud`, `.hud-card`/`.item-tray` class hooks — HUD text and structure; modify
  - `apps/web/src/styles.css` :: `:root`, `.game-hud`, `.hud-card`, `.hud-actions`, `.icon-button`, `.item-tray`, `.item-button`, mobile media rules — visual system/layout; modify
  - `apps/web/src/components/GameHud.test.tsx` :: HUD item position hooks/accessibility/action behavior; modify

#### Details
- `.item-tray`는 `position:absolute; left: clamp(0.5rem, 1.6vw, 1.25rem); bottom: clamp(0.5rem, 1.8vw, 1.25rem)`으로 고정한다. 이전 `right:50%`와 `translateX(50%)`를 제거한다. tray는 `pointer-events:auto`, parent HUD는 기존 `pointer-events:none` 정책을 유지한다.
- 세 item button은 desktop에서 기존 label/count를 유지한다. 모바일 media query에서도 세 버튼이 왼쪽 하단에 가로로 보이고 game-frame 밖으로 넘치지 않게 폭/간격을 줄인다. 앱이 aspect ratio와 viewport에 맞추는 기존 동작을 바꾸지 않는다.
- `.item-button`과 `.icon-button`에 2~3px 밝은 outline, 짙은 하단 border/box-shadow로 3D 두께, hover/active translate 효과, disabled 대비를 적용한다. 기존 disabled/action logic을 변경하지 않는다.
- `.hud-card`에 rounded pop-art outline과 짧은 그림자를 적용한다. chapter/score, ammo, pause/restart/mute 아이콘의 텍스트 대비는 배경과 최소 4.5:1 수준을 목표로 한다. 중요한 숫자는 굵은 text-shadow/stroke를 얇게 추가한다.
- CSS 테스트는 별도 computed-style 검증 라이브러리를 추가하지 않는다. `GameHud.test.tsx`에서 버튼 역할/aria-label, 클릭 handler, item labels/count, 상단 score/ammo 정보가 유지되는지 확인한다. 위치와 style은 browser visual review에서 확인한다.

### I02. Jua 폰트 포함
- Related Files:
  - `apps/web/package.json` :: dependency `@fontsource/jua` — bundled rounded typeface; modify
  - `package-lock.json` :: workspace dependency resolution — modify
  - `apps/web/src/main.tsx` :: global font CSS import — modify
  - `apps/web/src/styles.css` :: `:root font-family` — modify

#### Details
- `@fontsource/jua`를 `apps/web` dependency로 설치하고 lockfile을 갱신한다. `apps/web/src/main.tsx`에서 `@fontsource/jua/400.css`를 앱 CSS보다 앞서 import한다.
- `:root` font stack은 `"Jua", "Malgun Gothic", "맑은 고딕", sans-serif` 순서로 지정한다. system fallback은 package load가 실패할 때만 사용한다.
- 런타임에 Google Fonts URL을 요청하지 않는다. Vite production build output에 font asset이 포함되어야 한다.

## Acceptance Criteria
- [ ] 아이템 버튼 3개가 화면 왼쪽 아래에 있고 desktop/mobile에서 잘리지 않는다.
- [ ] HUD와 버튼에 둥근 외곽선, 하단 입체감, 고대비 아이콘/텍스트가 적용된다.
- [ ] Jua 폰트가 앱 bundle에서 로드되고 외부 font network 요청이 없다.
- [ ] 기존 mute/restart/item callbacks, score/ammo text와 responsive game frame이 유지된다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/components/GameHud.test.tsx` — HUD action and content tests pass.
- `npm.cmd run build --workspace @chicks-cannon/web` — TypeScript, Vite and bundled font assets build successfully.
- `npm.cmd test` — all existing workspace tests pass.
- Browser visual review at desktop landscape and mobile-sized viewport — item tray bottom-left, no overlay clipping, contrast/readability.
- `git diff --check` — whitespace checks pass.

## Commit Message
```text
feat(ui): polish game HUD with rounded pop art styling

Plan: 2026-10-20-chicks-cannon-graphics-overhaul
Phase: P01-visual-rework
Task: T04-hud-polish

- Move the item tray to the lower left and add dimensional controls
- Bundle Jua font and improve HUD text contrast
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
