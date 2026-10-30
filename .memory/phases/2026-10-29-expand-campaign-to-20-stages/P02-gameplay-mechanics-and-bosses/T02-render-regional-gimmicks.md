# Task: T02 Render Regional Gimmicks

## Status: pending

## Goal
Draw recognizable visual states for all four new gimmicks from engine snapshots, including trapdoor open/closed and moving clock-hand states, without adding image assets.

## Decision Summary
- Gimmick art is canvas-rendered in the existing renderer and follows current scene palette/line-art conventions.
- The engine snapshot is the only source of position, rotation, and transient state.

## Implementation

### I01. Draw new gimmick bodies and states
- Related Files:
  - `apps/web/src/game/renderer.ts` :: entity draw dispatch and gimmick draw helpers; modify.
  - `apps/web/src/game/types.ts` :: snapshot custom data contract; read-only unless T01 requires completion.
  - `apps/web/src/game/renderer.test.ts` :: draw assertions; modify.
- Details
  - Add a branch for each `GimmickKind`: `trapdoor`, `clockHand`, `conveyor`, `flowerLauncher`.
  - Draw trapdoor as a wood/stone inset panel with a visible hinge and seam; use entity angle and `customData.triggered` to show horizontal closed board or downward-open board.
  - Draw clock hand as a long brass beam with circular pivot cap and small clock markings; transform around snapshot pivot/body rotation so the displayed swing matches physics.
  - Draw conveyor as a dark belt with repeated light directional chevrons moving at a time-based animation rate. Its belt surface is horizontal and width follows body bounds.
  - Draw flower launcher as a golden-green stem/base with a five-petal flower cup; scale from radius and draw a short upward sparkle only on active launch animation, if snapshot state exposes it.
  - Use `ctx.save()/restore()` for each transform and preserve renderer context state. Add no new external/raster assets and keep the visuals legible at current canvas scale.
- Execution Flow / Logic
  1. Renderer dispatch maps `entity.kind` to the new helper.
  2. Each helper consumes only snapshot geometry/custom data and `sceneTime`; it does not mutate game state.
  3. Fall back to a simple colored shape if optional cosmetic state is absent.

### I02. Cover draw routing and visual state
- Related Files:
  - `apps/web/src/game/renderer.test.ts` :: each gimmick renders without errors and key state changes alter canvas calls; modify.
- Details
  - Reuse the existing canvas mock harness. Cover all four kinds, both trapdoor states, clock hand rotation, and renderer state restoration after each draw.

## Acceptance Criteria
- [ ] All four new entity kinds render with distinct, readable forms.
- [ ] Trapdoor and clock hand visuals track runtime state and rotation.
- [ ] Rendering has no external asset dependency and does not leak canvas transforms/styles.
- [ ] Renderer tests pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- renderer.test.ts` — new gimmick rendering cases pass.

## Commit Message
```text
feat(rendering): draw regional campaign gimmicks

Plan: 2026-10-29-expand-campaign-to-20-stages
Phase: P02-gameplay-mechanics-and-bosses
Task: T02-render-regional-gimmicks

- Draw four new mechanics using the canvas renderer
- Reflect open, rotating, and active states from snapshots
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
