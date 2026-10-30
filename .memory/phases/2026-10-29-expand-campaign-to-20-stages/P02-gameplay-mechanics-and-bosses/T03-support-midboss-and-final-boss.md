# Task: T03 Support Mid-Boss and Final Boss

## Status: pending

## Goal
Drive boss health, weakpoint, victory, reward, rendering, and UI behavior from each stage's explicit `bossRole` so stage 6 remains a complete mid-boss encounter and stage 20 owns campaign victory.

## Decision Summary
- `StageDefinition.bossRole` is the authority: stage 6 is `mid`, stage 20 is `final`, and all other stages have no boss role.
- Only a defeated final boss ends the campaign and claims the final reward; defeating the mid-boss transitions to normal evolution/next-stage flow.
- Boss-specific choreography currently keyed to stage 6 or `LAST_STAGE` must use the explicit role.

## Implementation

### I01. Refactor engine boss lifecycle to role checks
- Related Files:
  - `apps/web/src/game/engine.ts` :: `spawn`, boss damage/settlement, chandelier weakpoint, `claimFinalReward`, `loadStage`, `createSnapshot`; modify.
  - `apps/web/src/game/types.ts` :: `StageDefinition.bossRole`; read-only after P01.
  - `apps/web/src/game/engine.test.ts` :: boss flow tests; modify.
- Details
  - Add private helpers `get bossRole(): 'mid'|'final'|null` and `get hasBoss(): boolean`, backed by `STAGES[this.stage].bossRole`.
  - Spawn HP on `SpawnSpec.boss` regardless of stage number. `bossHp`/`bossMaxHp` in snapshots are nonzero only when `hasBoss`.
  - Keep existing special chandelier weakpoint choreography final-only (`bossRole === 'final'`). Mid-boss must have a non-chandelier viable route based on stage-6 data.
  - Any current `this.stage === LAST_STAGE` condition must be classified: campaign completion/reward checks use `bossRole === 'final'`; boss health/health phase/health UI use `hasBoss`; final-only weakpoint/chandelier use role `final`; regular stage mechanics remain role independent.
  - `checkTurnSettlement`: wait for `bossHp <= 0` only when `hasBoss`; completion state is `ENDING` only when role is `final`, otherwise normal `EVOLUTION` and next stage unlock logic applies.
  - `claimFinalReward` succeeds only in `ENDING` with `bossRole === 'final'`, and resets final reward claim only when loading a final boss stage.
  - Ensure any boss spawn sets max health once and no generic stage-20 check accidentally assumes all bosses are final.
- Execution Flow / Logic
  1. Read role from stage definition as a single source of truth.
  2. Apply boss state and HUD snapshot for both boss roles; apply final-only reward and ending only to final.
  3. Keep next-stage progression for stage 6 and preserve campaign completion for stage 20.

### I02. Update all boss presentation and reward assumptions
- Related Files:
  - `apps/web/src/App.tsx` :: final won HUD suppression; modify.
  - `apps/web/src/components/DialoguePanel.tsx` :: boss story selection; modify.
  - `apps/web/src/components/GameHud.tsx` :: boss mode and health panel; modify.
  - `apps/web/src/components/GameModal.tsx` :: stage-clear modal rule; modify.
  - `apps/web/src/game/renderer.ts` :: boss shake/festival particles/victory; modify.
  - `apps/web/src/game/use-chick-cannon.ts` :: victory fanfare; modify.
- Details
  - Replace literal stage 6 and `LAST_STAGE` presentation checks with boss role from `STAGES[snapshot.stage].bossRole`.
  - Both boss stages show health and boss dialogue. Only final stage hides ordinary stage-clear UI during `WON`, plays victory fanfare, draws campaign finale effects, and triggers ending/reward presentation. Stage 6 returns to map with next stage 7 unlocked.
  - Label stage-6 boss as `중간 보스` and stage-20 boss as `최종 보스`; don't retain the old festival-final label for stage 6.
- Details (tests)
  - Update `GameHud.test.tsx`, `GameModal.test.tsx`, `DialoguePanel.test.tsx`, `renderer.test.ts`, and relevant App/hook assertions for both roles.

## Acceptance Criteria
- [ ] Stage 6 uses boss health and can be defeated without completing the campaign.
- [ ] Stage 20 requires boss defeat, enters the ending, and grants the final reward exactly once.
- [ ] Boss UI and rendering work for both encounters; final-only fanfare/effects occur only at stage 20.
- [ ] Boss and UI tests pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- engine.test.ts GameHud.test.tsx GameModal.test.tsx DialoguePanel.test.tsx renderer.test.ts` — mid/final boss behavior passes.

## Commit Message
```text
feat(boss): separate mid-boss and campaign finale

Plan: 2026-10-29-expand-campaign-to-20-stages
Phase: P02-gameplay-mechanics-and-bosses
Task: T03-support-midboss-and-final-boss

- Drive boss systems from explicit stage boss roles
- Keep stage 6 as a mid-boss and reserve ending for stage 20
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
