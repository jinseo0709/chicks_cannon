# Task: T02 Engine Scoring and Rules

## Status: done

## Goal
Make the engine expose unambiguous campaign and current-stage accounting, restore stage-entry resources on retry, calculate the agreed clear-star rating, and treat broken eggs as a score penalty rather than a loss.

## Decision Summary
- Four existing item kinds (`booster`, `quake`, `mega`, `butter`) each start a stage with one charge and refill on every retry.
- Breaking an egg subtracts 500 from current-stage score, floored at zero, and never directly fails a stage.
- Stars are 1 for a clear, 2 with at least one shot remaining, 3 with at least half the initial stage ammo remaining and current-stage score meeting its target.
- Retry restores the campaign total captured at stage entry and discards that attempt's score. A completed-stage replay may update stars but must not add replay score to campaign total.

## Implementation

### I01. Snapshot and engine accounting
- Related files:
  - `apps/web/src/game/types.ts` :: `GameSnapshot`; add explicit `stageScore`, `scoreTarget`, `stageAmmo` (initial ammo), `stageStars` or clear result fields needed by UI. Keep `score` as campaign total for existing ending/leaderboard callers.
  - `apps/web/src/game/engine.ts` :: `ChickCannonEngine`, `loadStage`, `retryStage`, `addScore`, `checkTurnSettlement`, `createSnapshot`; modify.
  - `apps/web/src/game/constants.ts` :: stage score targets; add an explicit six-entry target table or move targets into `StageDefinition` and update all six entries.
  - `apps/web/src/game/engine.test.ts`, `apps/web/src/game/engine-gimmicks.test.ts` :: add focused behavior coverage.
- Details:
  - Maintain `campaignScore`, `stageScore`, `stageEntryCampaignScore`, and a per-stage attempt score. Preserve `GameSnapshot.score` as campaign total; expose stage score and target separately.
  - On entering a stage through `selectStage` or campaign progression, capture the current campaign total as the retry checkpoint and reset stage score to zero. On `retryStage`, restore campaign score to that checkpoint, reset stage score, set ammo to that stage's initial ammo, set all four item counts to one, clear transient item targeting/score popups/defeat state, and respawn the stage.
  - On completed-stage replay, mark the run as replay-only. It may accumulate temporary stage score for score targets and stars, but do not mutate campaign total; returning through progression must not count replay points as campaign points. Preserve normal campaign flow when entering the next stage after a first-time clear.
  - Route every scoring event through one helper that adds points to stage score and adds to campaign score only for a non-replay campaign attempt. Egg destruction applies a single `-500` to stage score with `Math.max(0, stageScore - 500)` and updates campaign score consistently for a normal attempt by the actual delta (including floor behavior); it must not apply repeatedly on later frames.
  - Remove the broken-egg `LOST`/`hostage` transition from `checkTurnSettlement`; preserve egg entity destruction and any visual feedback. Cats remain the win condition and ammo exhaustion remains the loss condition.
  - Define integer star thresholds precisely: 1 if state resolves to clear; 2 if clear and remaining ammo >= 1; 3 if clear, remaining ammo >= `Math.ceil(stageAmmo / 2)`, and stage score >= that stage's explicit target. Three-star condition implies clear and may also satisfy two-star. Publish the final rating in the snapshot during `WON`/clear UI states.
  - Stage targets must be calibrated as per-stage values, not campaign-total thresholds. Use current-stage score only. Set values after inspecting current score awards so defeating all cats plus one strong chain reaction can reach the target; do not require destroying every block.
- Acceptance criteria:
  - Engine tests cover score accumulation, stage-local reset, retry rollback, one-per-stage egg penalty/floor, egg no longer causing loss, item refill, ammo reset, star boundary conditions for odd/even ammo, and replay exclusion from campaign score.
  - Existing ending score remains the campaign total, and all old consumers compile against the snapshot additions.

### I02. State transitions and campaign progression
- Related files:
  - `apps/web/src/game/engine.ts` :: `advanceEvolution`, `selectStage`, `startCampaign`, `retryStage`; modify as needed.
  - `apps/web/src/game/use-chick-cannon.ts` :: controller surface; read-only unless snapshot fields or replay mode require a wrapper.
- Details:
  - Ensure first-time clear can continue to the next stage without resetting campaign score and that each new stage establishes a fresh retry checkpoint and item refill.
  - Ensure retry during loss and manual retry from the pause/HUD use the same rollback path.
  - Ensure restart campaign resets campaign score and replay mode while retaining the existing progress storage, which is owned by `App`.
- Validation:
  - `npm test --workspace @chicks-cannon/web -- engine.test.ts engine-gimmicks.test.ts`
  - `npm run typecheck --workspace @chicks-cannon/web`
  - `git diff --check`

## Commit Message
```text
feat(game): add stage score, retry checkpoints, and star rules

Plan: 2026-10-22-gameplay-difficulty-curve
Phase: P01-campaign-progression
Task: T02-engine-scoring-and-rules

- Separate current-stage points from campaign total
- Apply egg penalties, resource refills, retry rollback, and clear stars
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`engine.test.ts`, `engine-gimmicks.test.ts`: 34 passed; web typecheck; `git diff --check`)
- commit: pending
