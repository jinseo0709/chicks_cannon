# Task: T02 Persist Campaign Progress

## Status: pending

## Goal
Load and save validated 20-stage completion, best stars, and challenge badges through the existing browser storage abstraction, preserving progress between sessions and safely recovering from malformed or unavailable storage.

## Decision Summary
- The campaign progress key remains `chicks-cannon-world-progress-v1`.
- Persist completed stages, each stage's best 1–3 stars, and challenge badge stage IDs.
- Progress is sequentially unlocked and must never be erased during app initialization.

## Implementation

### I01. Normalize and persist campaign progress
- Related Files:
  - `apps/web/src/game/progress.ts` :: `CampaignProgress`, `createEmptyCampaignProgress`, `clearSavedCampaignProgress`, `recordStageResult`; modify and export `loadCampaignProgress`, `saveCampaignProgress`, `getUnlockedStage`.
  - `apps/web/src/game/progress.test.ts` :: progress persistence tests; modify.
- Details
  - Schema: `CampaignProgress = { version: 4; completedStages: GameStage[]; bestStars: Partial<Record<GameStage,1|2|3>>; challengeBadges: GameStage[] }`.
  - `loadCampaignProgress(storage: Pick<Storage,'getItem'>): CampaignProgress` reads key `chicks-cannon-world-progress-v1`, parses JSON and returns normalized v4 progress. Missing, invalid JSON, wrong schema version, or inaccessible storage returns `createEmptyCampaignProgress()` without throwing. For version 3 data, migrate valid stage IDs 1–6 into v4, preserving stars/badges and completion; this keeps previous sessions useful. Filter every ID to integer 1–20; de-duplicate and sort ascending. Keep only valid stars 1,2,3. A badge is retained only when its stage is completed.
  - `saveCampaignProgress(storage: Pick<Storage,'setItem'>, progress: CampaignProgress): void` serializes a normalized progress object to the same key; storage exceptions are swallowed so gameplay remains usable.
  - `recordStageResult` retains completion, the maximum of prior/new stars, and adds a badge only when `challengeWon`; it does not delete earlier badges on a replay without a badge.
  - `getUnlockedStage(progress): GameStage` returns the first incomplete stage from `STAGE_ORDER`; if all 20 are complete, return 20.
  - Keep `clearSavedCampaignProgress` as an explicit reset helper only; no app-load path may invoke it.
- Execution Flow / Logic
  1. Parse and normalize untrusted storage; apply v3 migration only when `version === 3` and accepted shape fields exist.
  2. On stage result, compute normalized new progress and persist it through the storage guard.
  3. Callers derive unlock state from normalized completion; stage 20 remains selectable after all stages clear.

### I02. Test persistence and migration boundaries
- Related Files:
  - `apps/web/src/game/progress.test.ts` :: load, save, migration, normalization; modify.
- Details
  - Cover fresh storage, successful round trip, v3 migration, malformed JSON, unsupported version, invalid stage IDs/stars, duplicate IDs, bad storage getters/setters, best-star preservation, badge preservation on replay, and first-incomplete unlock at stage 1, 6, 20, and completed campaign.

## Acceptance Criteria
- [ ] Valid saved progress survives reload and is normalized to stages 1–20.
- [ ] Existing v3 progress migrates, malformed/unavailable storage does not crash, and app initialization never clears saved data.
- [ ] Completed stages, best stars, and badges retain correct replay semantics.
- [ ] Progress tests pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- progress.test.ts` — migration, storage, and unlock tests pass.

## Commit Message
```text
feat(progress): persist 20-stage campaign results

Plan: 2026-10-29-expand-campaign-to-20-stages
Phase: P01-campaign-data-and-progress
Task: T02-persist-campaign-progress

- Load and normalize campaign records from browser storage
- Preserve stars, badges, and sequential unlock state
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
