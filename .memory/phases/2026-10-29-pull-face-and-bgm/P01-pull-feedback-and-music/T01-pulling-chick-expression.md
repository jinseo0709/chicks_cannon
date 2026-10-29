# Task: T01 Pulling Chick Expression

## Status: done

## Goal
Show the loaded chick gradually squinting and blushing as the player pulls farther from the slingshot, restoring its authored face as soon as there is no active pull.

## Decision Summary
- Keep all existing chick artwork. Render a Canvas 2D facial overlay on the loaded chick only.
- Derive intensity from the current `aimPosition` distance divided by `WORLD.maxDrag`, clamped to `[0, 1]`.

## Implementation

### I01. Pass pull intensity into the loaded-chick renderer
- Related Files:
  - `apps/web/src/game/renderer.ts` :: `drawLoadedChick`, `drawSprite`; modify
  - `apps/web/src/game/renderer.test.ts` :: existing renderer coverage; read-only unless validation requires a specific fix

#### Details
- `drawLoadedChick(snapshot, nowMs)` already returns unless state is `AIMING` and ammo is available. Keep that guard.
- Let `center` be `WORLD.cannon`; let `position` remain `snapshot.aimPosition ?? center`.
- Compute `pullStrength = snapshot.aimPosition ? Math.min(1, Math.hypot(position.x - center.x, position.y - center.y) / WORLD.maxDrag) : 0`.
- Preserve the existing loaded chick `GameEntityView` and sprite size. Pass `pullStrength` as an optional argument to `drawSprite(entity, stage, nowMs, pullStrength)`; do not add it to the shared entity model.
- Extend `drawSprite` with `pullStrength = 0`. Draw the current authored image/fallback first. When `entity.id === -1 && pullStrength > 0`, draw an effort face in the same translated/rotated local coordinate space before restoring the context.
- Base face layout on the stage-1 SVG's `viewBox="-48 -48 96 96"`: eye centers at x = ±10 units and y = 2 units; beak center at y = 14 units. Convert SVG units to canvas units with `width / 96`.
- Draw two curved closed-eye lines, scaling line curvature/weight smoothly with `pullStrength`; add a subtle warm pink cheek circle on each side with alpha proportional to pull strength. Keep the beak visible and do not cover the chick silhouette. Clamp all opacity and geometry for small chick sizes.
- Other chicks, eggs, cats, and idle loaded chicks must retain their current appearance.

### I02. Verify the implementation
- Related Files:
  - `apps/web/src/game/renderer.ts` :: changed symbols; modify

#### Details
- TypeScript compilation and the production web build must succeed.
- Check the rendered source logic for pull strengths of 0, 0.5, and 1: no overlay at 0; progressively stronger squint/blush at higher values.
- Confirm cancellation/release clears `aimPosition` through the existing engine/input flow so the face returns to normal without new state.

## Acceptance Criteria
- [x] The loaded chick shows an increasingly effortful, cute face as pull distance increases.
- [x] The face returns to the authored expression when aim is released or canceled.
- [x] Existing chick variants and other entities are unaffected.
- [x] Production web build succeeds.

## Validation
- `npm.cmd run build --workspace @chicks-cannon/web` — must complete without TypeScript or Vite errors.

## Commit Message
```text
feat(game): 새총 당김 표정 연출 추가

Plan: 2026-10-29-pull-face-and-bgm
Phase: P01-pull-feedback-and-music
Task: T01-pulling-chick-expression

- 당기는 거리에 따라 병아리 눈과 볼 표정이 변하도록 렌더링
- 발사·취소 시 기존 표정으로 복귀
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
