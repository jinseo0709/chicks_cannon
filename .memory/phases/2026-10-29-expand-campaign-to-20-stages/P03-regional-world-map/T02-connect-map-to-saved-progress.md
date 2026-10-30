# Task: T02 Connect Map to Saved Progress

## Status: done

## Goal
Initialize the app from saved campaign state, keep it updated on each clear, and route the map to the region and stage the player should resume.

## Decision Summary
- App startup must load browser-saved progress and must not clear it.
- The next incomplete stage is the sequentially unlocked stage; completed stages remain replayable.
- A region's next chick form becomes available when its five stages are complete.

## Implementation

### I01. Wire progress storage and regional unlocks into app state
- Related Files:
  - `apps/web/src/App.tsx` :: campaign state initialization, clear effect, `openStage`, region selection; modify.
  - `apps/web/src/game/progress.ts` :: load/save/unlock helpers; read-only after P01.
  - `apps/web/src/components/WorldMapScreen.tsx` :: pass region state and callbacks; modify after T01.
  - `apps/web/src/components/HomeScreen.tsx` :: resume stage/form data if required; modify only if current prop contract cannot represent the new selected stage.
- Details
  - Initialize `CampaignProgress` with a lazy initializer `loadCampaignProgress(getSafeBrowserStorage())`; remove app-load invocation of `clearSavedCampaignProgress`.
  - Derive `unlockedStage` via `getUnlockedStage(progress)`. Do not keep a local duplicated 1–20 search list.
  - On clear result, use `recordStageResult`, update React state, and call `saveCampaignProgress(getSafeBrowserStorage(), nextProgress)` once for that result. Avoid writing during every render. If current result effect can repeat, guard by a stable `{stage,stars,challengeWon}` result key so one clear is recorded once per result.
  - Add parent-owned `selectedRegion` state. Initialize it to the region of `unlockedStage`; when all stages are complete use region 4. Pass selected region to map and set it when navigating pages or selecting a stage. On clear and return to map, navigate to the new unlocked stage's region.
  - Gate `openStage(stage)` so stage is accepted only if `stage <= unlockedStage` or included in `completedStages`. Preserve explicit replay of completed stages.
  - Map's displayed current form uses `CHICK_FORMS[stage].formId`. The form unlock boundary is completion-driven: stages 6, 11, and 16 may be launched only after completion of prior region (the linear unlock rule already enforces this). Evolution UI at clears 5, 10, and 15 announces the next region's form; no form upgrade is granted on the stage-6 mid-boss clear.
  - On browser storage missing (server render, privacy mode, storage exception), use empty progress and keep session playable; use `getSafeBrowserStorage()` consistently for reads/writes.
- Execution Flow / Logic
  1. App mounts and reads normalized progress once.
  2. Derive first incomplete stage, selected region, and map form from that progress.
  3. A successful clear updates memory and storage exactly once; returning to the map shows updated unlocks and region.

### I02. Replace reset-on-load regression coverage
- Related Files:
  - `apps/web/src/App.test.tsx` :: initial progress and completion integration; modify.
- Details
  - Replace test asserting storage is cleared on load. Cover saved completion/star/badge restore, next incomplete stage and region selection, app mount with absent/broken storage, and writing a stage result without duplicate completion or badge loss.

## Acceptance Criteria
- [x] Reload restores completion, stars, badges, selected resume stage, and region.
- [x] Loading the app never removes saved progress; unavailable storage falls back without crashing.
- [x] Clear events save once and region form gates follow stage unlock boundaries.
- [x] App progress integration tests pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- App.test.tsx progress.test.ts` — app restore/save and progress helper tests pass.

## Commit Message
```text
feat(progress): resume campaign from saved stage

Plan: 2026-10-29-expand-campaign-to-20-stages
Phase: P03-regional-world-map
Task: T02-connect-map-to-saved-progress

- Restore and save campaign progress through the app lifecycle
- Route map and evolution state from regional unlock boundaries
```

## Progress
- [x] Implementation complete
- [x] Validation passed: 15 app/progress tests and production build passed.
- commit: `e4c9e5b` (`feat(progress): 저장된 지역 진행으로 이어하기`)
