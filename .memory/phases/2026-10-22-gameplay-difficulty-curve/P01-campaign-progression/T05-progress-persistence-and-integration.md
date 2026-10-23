# Task: T05 Progress Persistence and Integration

## Status: done

## Goal
Persist completed stages and each stage's best star rating in browser storage, show completion/best stars on the world map, and verify first-time progression, retries, and completed-stage replay as one campaign flow.

## Decision Summary
- Browser progress stores stage completion and best stars. The map shows each stage's highest rating; clear UI shows the current run's rating.
- Replaying completed content may improve best stars but never increases campaign total score.
- Existing leaderboard submission remains campaign-total-only at campaign ending; do not change API/storage contract.

## Implementation

### I01. Progress model and safe storage migration
- Related files:
  - `apps/web/src/App.tsx` :: `PROGRESS_KEY`, `loadCompletedStages`, progress effect, `openStage`; modify.
  - `apps/web/src/game/types.ts` :: `GameStage`; read-only.
  - `apps/web/src/App.test.tsx` :: browser progress behavior; modify.
- Details:
  - Replace the completion-only JSON array at `chicks-cannon-world-progress-v1` with a versioned object containing `completedStages: GameStage[]` and `bestStars: Partial<Record<GameStage, 1 | 2 | 3>>`. Continue accepting the legacy array by migrating it to completed stages with zero/unknown stars; do not invent historic star scores.
  - Validate parsed storage defensively: only stages 1–6, only star integers 1–3, ignore duplicate/invalid entries, catch unavailable storage and malformed JSON as empty progress.
  - On `EVOLUTION` or `ENDING`, mark stage complete and update best stars with `Math.max(previous, currentRunStars)`. Do not write progress during failed runs.
  - Make completed stages selectable for replay as current map behavior permits; preserve first-incomplete unlock progression.
- Acceptance criteria:
  - Tests cover empty storage, legacy array migration, malformed JSON, invalid stages/stars, completion write, and best-star max behavior.

### I02. World map star display and full-flow verification
- Related files:
  - `apps/web/src/components/WorldMapScreen.tsx` :: `WorldMapScreenProps`, stage node; modify.
  - `apps/web/src/App.tsx` :: pass best-star map to `WorldMapScreen`; modify.
  - `apps/web/src/App.test.tsx` and `apps/web/src/components/WorldMapScreen.test.tsx` (new if no existing map spec) :: integration coverage; add/modify.
  - `apps/web/src/components/EndingModal.tsx`, `apps/web/src/components/ScoreSubmissionPanel.tsx` :: inspect campaign score path; read-only unless integration correction is required.
- Details:
  - Add `bestStars` to the map component props and render a compact three-slot rating on every unlocked/completed stage node, using filled/empty styling. A stage without a recorded rating displays three empty slots.
  - Keep completion/unlock/current indicators and node selection behavior. Ensure star markup has accessible text, e.g. “최고 별점 2/3”.
  - Verify new-campaign clears campaign score; entering a stage establishes retry checkpoint; retry restores checkpoint and all four items; a first-time win advances and is recorded; replay win only updates best stars; final leaderboard submission receives campaign score without replay points.
  - Do not change API request schema, leaderboard ranking policy, or existing campaign completion flow.
- Acceptance criteria:
  - Integration tests prove best stars persist across app remount and only improve, replay score is excluded, and campaign completion still submits campaign total.
  - Map remains legible at existing responsive breakpoints.

## Validation
- `npm test --workspace @chicks-cannon/web -- App.test.tsx WorldMapScreen.test.tsx EndingModal.test.tsx`
- `npm test --workspace @chicks-cannon/web`
- `npm run build --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(progress): persist stage completion and best stars

Plan: 2026-10-22-gameplay-difficulty-curve
Phase: P01-campaign-progression
Task: T05-progress-persistence-and-integration

- Store validated completion and best-star progress with legacy migration
- Show best ratings on the map and preserve campaign score on replays
```

## Progress
- [x] Implementation complete
- [x] Validation passed (targeted tests: 10 passed; web tests: 116 passed; web production build; `git diff --check`)
- commit: pending
