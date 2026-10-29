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
- The game uses the full-bleed PNG art, so use positions measured against each PNG rather than the old SVG reference. When `assetVariant === 1` and `pullStrength > 0.12`, use the already-loaded `chick-1-blink` sprite as the pulling expression. For variants 2–4, map the face to a 96-unit square (`scale = width / 96`) and use these eye centers: variant 2 `[0, 27]` at y `-6`; variant 3 `[8, 24]` at y `-1`; variant 4 `[5, 29]` at y `-3`. Use variant-specific cheek centers `[−8, 28]` at y `5`, `[−4, 34]` at y `7`, and `[−7, 34]` at y `5`, respectively.
- For variants 2–4, draw clearly visible curved closed-eye strokes over those centers and strengthen the cheeks with pink circles. Scale eye curvature, stroke weight, and cheek opacity with `pullStrength`; keep the beak visible and do not cover the chick silhouette. Clamp opacity and geometry for small chick sizes.
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
