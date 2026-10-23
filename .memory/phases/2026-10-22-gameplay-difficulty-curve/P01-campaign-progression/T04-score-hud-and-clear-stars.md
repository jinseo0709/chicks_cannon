# Task: T04 Score HUD and Clear Stars

## Status: done

## Goal
Expose the immediate stage objective during play and show the earned 1–3 star rating in the clear scene while retaining campaign total score as secondary information.

## Decision Summary
- Stage score and progress toward the stage's three-star target are prominent; campaign score is smaller.
- Show the stars earned in the stage-clear scene. The world map's best-star rendering is owned by T05.

## Implementation

### I01. Stage score and target HUD
- Related files:
  - `apps/web/src/components/GameHud.tsx` :: `GameHud`; modify.
  - `apps/web/src/game/types.ts` :: `GameSnapshot`; consume fields introduced in T02.
  - `apps/web/src/styles.css` or the actual stylesheet imported by `App.tsx` :: HUD responsive rules; locate and modify.
  - `apps/web/src/components/GameHud.test.tsx` :: assertions; modify.
- Details:
  - Show `stageScore` as the largest score value and show a formatted target such as current/target plus a bounded progress indicator. Clamp visual progress to 100% while preserving values over target in text if useful.
  - Keep campaign `score` visibly secondary (smaller label or lower emphasis) so existing campaign accumulation remains understandable.
  - Keep ammo dots based on the stage's initial ammo and remaining ammo. Confirm all six shots fit at narrow view widths; wrap or compact dots without covering item controls.
  - Hide or inert gameplay controls in non-active states as the component currently does.
- Acceptance criteria:
  - Component tests verify stage score, target, progress, campaign total, and ammo rendering.
  - At 320x740 and 390x844 HUD areas do not overlap; desktop remains balanced.

### I02. Clear result star presentation
- Related files:
  - `apps/web/src/components/GameModal.tsx` :: `WON` branch; modify.
  - `apps/web/src/components/GameModal.test.tsx` :: clear modal assertions; modify.
  - `apps/web/src/App.tsx` :: pass snapshot fields only if modal props are not already snapshot-based; modify only if necessary.
- Details:
  - Use the calculated stage star rating from the T02 snapshot and render three fixed star slots, clearly distinguishing earned and unearned stars.
  - Include current stage score and target status on the clear result so the rating is explainable. Do not alter final campaign ending submission UI.
  - Keep retry/continue actions and current evolution transition behavior intact.
- Acceptance criteria:
  - Clear scene shows exactly one, two, or three earned stars from engine output and does not recompute a divergent score rule in React.

## Validation
- `npm test --workspace @chicks-cannon/web -- GameHud.test.tsx GameModal.test.tsx`
- `npm run typecheck --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(ui): show stage score goals and clear stars

Plan: 2026-10-22-gameplay-difficulty-curve
Phase: P01-campaign-progression
Task: T04-score-hud-and-clear-stars

- Promote stage score and target progress in the HUD
- Present earned stars in the clear scene
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`GameHud.test.tsx`, `GameModal.test.tsx`: 11 passed; web typecheck; `git diff --check`)
- commit: pending
