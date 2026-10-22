# Task: T03 Material Damage Feedback

## Status: done

## Goal
Make block weakening visible in the game canvas using the existing HP and material data, with distinct wood cracks, spreading glass cracks, and chipped stone corners, without persistent health bars.

## Decision Summary
- Damage feedback is tied to remaining block HP and is material-specific: wood cracks, glass cracks spread, stone corners chip.
- Existing numeric score popups stay separate from structural damage feedback; do not add HP bars.

## Implementation

### I01. Damage-state rendering
- Related files:
  - `apps/web/src/game/types.ts` :: `GameEntityView.hp`, `maxHp`, `material`; read-only unless normalized damage stage is explicitly added.
  - `apps/web/src/game/renderer.ts` :: block draw path around `drawEntity` and material helpers; modify.
  - `apps/web/src/game/renderer.test.ts` :: rendering coverage; modify.
- Details:
  - Use `damageRatio = 1 - clamp(hp / maxHp, 0, 1)` when both values are present and `maxHp > 0`; undamaged blocks have ratio 0 and destroyed blocks are already removed/hidden by current entity lifecycle.
  - Apply at least two visible damage thresholds before destruction. Wood: draw fine dark cracks on the front face. Glass: draw a central impact origin and branching lines that increase in number/length at higher damage. Stone: add missing/chipped corner facets at higher damage. Avoid changing material fill colors so damage remains legible across stage themes.
  - Keep decorations within the entity's rotated local rectangle; transform with the same canvas context as the block so marks rotate with falling blocks.
  - Do not draw damage marks on TNT unless a separate existing visual currently handles it; TNT remains visually distinct and detonates through engine rules.
  - Decorative strokes must remain clipped to the block bounds and must not introduce per-frame randomness; derive crack patterns deterministically from entity id and damage tier.
- Acceptance criteria:
  - Renderer tests or deterministic canvas assertions demonstrate each material draws a damage state at the expected thresholds and draws none at full HP.
  - No persistent HP number or bar is rendered.

## Validation
- `npm test --workspace @chicks-cannon/web -- renderer.test.ts`
- `npm run typecheck --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(rendering): show material-specific block damage

Plan: 2026-10-22-gameplay-difficulty-curve
Phase: P01-campaign-progression
Task: T03-material-damage-feedback

- Render progressive cracks in wood and glass
- Chip stone corners as blocks lose health
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`renderer.test.ts`: 10 passed; web typecheck; `git diff --check`)
- commit: pending
