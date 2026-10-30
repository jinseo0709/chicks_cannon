# Task: T01 Integrate and Validate the Campaign

## Status: pending

## Goal
Remove residual assumptions that the game has six stages or that stage 6 is its finale, then validate the full data-to-game-to-map flow through the stage-20 ending.

## Decision Summary
- Campaign length and final stage come from `STAGE_ORDER` / `LAST_STAGE`; boss identity comes from `StageDefinition.bossRole`.
- Existing beginner item rewards on stages 1–5 remain unchanged; this campaign expansion does not introduce extra reward types.
- The final campaign has 20 stages, four regions, and 60 possible stars.

## Implementation

### I01. Audit and update residual campaign-length assumptions
- Related Files:
  - `apps/web/src/game/items.ts` :: `STAGE_CLEAR_REWARDS`; inspect and keep the current stage 1–5 beginner item rewards unchanged.
  - `apps/web/src/game/constants.ts` :: campaign length and score/form exports; read-only after P01.
  - `apps/web/src/App.tsx` :: app flow; read/update only residual stage-count checks after P02/P03.
  - `apps/web/src/game/use-chick-cannon.ts` :: stage-specific audio transitions; ensure final fanfare reads explicit final boss role.
  - `apps/web/src/game/renderer.ts` :: stage-specific ending/festival checks; ensure stage 6 mid-boss and stage 20 finale are distinct.
  - `apps/web/src/components/DialoguePanel.tsx`, `GameHud.tsx`, `GameModal.tsx` :: remaining stage-index checks; ensure metadata-based boss presentation.
  - `apps/web/src/game/asset-cache.ts` :: stage image mapping; ensure all stages resolve existing background/form assets.
- Details
  - Search production source for literal six-stage assumptions: `stage === 6`, `stage===6`, `LAST_STAGE`, fixed `[1, 2, 3, 4, 5, 6]`, hard-coded `6 / 6`, six-stage progress text, or `toHaveLength(6)` assertions. For each match classify it as (a) actual boss identity, replace with `STAGES[stage].bossRole`; (b) campaign end, replace with `LAST_STAGE`; or (c) valid region boundary (stage 6 starts region 2), derive from `REGIONS` / stage region metadata. Do not change numeric stage references in authored story/data.
  - Do not change `STAGE_CLEAR_REWARDS` existing mappings for 1–5. Verify stage 6 mid-boss does not trigger final reward behavior and stage 20 final reward is still claimed once by the existing reward path.
  - Ensure progress UI represents completion `20 / 20` and stars maximum 60; region node pages show 15 slots for five stages, not 60.
  - Verify stage asset mapping uses only existing assets `background-1` through `background-6`; no missing paths for stage 7–20.
  - Check `LAST_STAGE` is used only for campaign boundary/complete checks and not as a generic substitute for boss existence; all boss stages use `bossRole`.

### I02. Update regression coverage and run repository validation
- Related Files:
  - `apps/web/src/App.test.tsx` :: stage startup, unlock and saved progress; modify as needed.
  - `apps/web/src/game/engine.test.ts` :: all-stage clear loop and mid/final boss progression; modify as needed.
  - `apps/web/src/game/stages.test.ts` :: stage completeness and curve; modify as needed.
  - `apps/web/src/game/progress.test.ts` :: 20-stage storage boundaries; modify as needed.
  - `apps/web/src/game/asset-cache.test.ts` :: 20-stage asset coverage; modify as needed.
  - `apps/web/src/components/WorldMapScreen.test.tsx` :: regional map; modify as needed.
  - `apps/web/src/components/GameHud.test.tsx`, `GameModal.test.tsx`, `DialoguePanel.test.tsx`, `apps/web/src/game/renderer.test.ts` :: dual boss presentation; modify as needed.
- Details
  - Update prior tests that assume six stages, six themes, stage-6 ending, 18 stars on a single map, or progress reset on app load.
  - Full campaign progression test: iterate `STAGE_ORDER`; assert each stage is playable and scene/score target exists; after clearing 1–5 next unlocked is 6 and form is breeze, after 6 next is 7 and no campaign-complete flag, after 10/15 the next region form is fighter/golden, after 19 unlock 20, and only defeating stage-20 boss sets campaign complete/ENDING.
  - Cover `bestStars` maximum by clearing each of 20 stages for 3 stars; global star total is 60. Verify all four map pages display only their own five stage nodes and completed progress survives remount.
  - Run focused tests for all modified modules, then the full web workspace test suite and production build. Resolve failures within this task; do not waive existing regressions.

## Acceptance Criteria
- [ ] No active production path treats six as the campaign length or stage 6 as the final boss.
- [ ] Stage 6 remains a replayable mid-boss clear and stage 20 is the sole campaign ending.
- [ ] Four regions, 20 stage records, four forms, existing six backgrounds, and all 60 possible stars validate together.
- [ ] Full web test suite and production build pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web` — all web unit and component tests pass.
- `npm.cmd run build --workspace @chicks-cannon/web` — TypeScript and production build pass.

## Commit Message
```text
feat(campaign): complete 20-stage campaign integration

Plan: 2026-10-29-expand-campaign-to-20-stages
Phase: P04-integration-and-validation
Task: T01-integrate-and-validate-campaign

- Remove remaining six-stage and stage-6 finale assumptions
- Validate campaign progression, persistence, bosses, and map pages
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
