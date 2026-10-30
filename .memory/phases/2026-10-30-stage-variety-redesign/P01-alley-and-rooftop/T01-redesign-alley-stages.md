# Task: T01 Redesign Alley and Wall Stages

## Status: done

## Goal
Replace repeated fort arrangements in stages 1–5 with five distinct encounter shapes and make the authored routes teach each stage’s weak point or gimmick.

## Decision Summary
- Keep region 1, stages 1–5, baby chick, themes, story, gimmicks, ammo, timers, and progression.
- Stage identity must come from the physical layout and primary solution, not a renamed level or minor coordinate change.
- Preserve spawn counts/reward classes where practical; update score targets if those change.

## Implementation

### I01. Author distinct spawn layouts and route descriptions
- Related Files:
  - `apps/web/src/game/stages.ts` :: `STAGES[1]`–`STAGES[5]`, `fort`; edit spawns/routes/instructions and add a helper only for a genuinely different structural pattern.
  - `apps/web/src/game/types.ts` :: `StageDefinition`, `SpawnSpec`; read-only unless required.
  - `apps/web/src/game/constants.ts` :: `STAGE_SCORE_TARGETS`; adjust only if spawn reward basis changes.
- Details:
  - Give each stage a different dominant shape drawn from a low tutorial stack, offset targets, trapdoor lane, boulder-driven support break, and timed gate approach; avoid repeated tower pairs.
  - Preserve titles, dialogue, theme, progression, and region-1 trapdoor identity.
  - Update both attack routes and `story.instruction` to identify present targets and plausible physical interactions.
  - Keep spawn centers within the 1280×720 world, avoid unintended static-body intersections, and leave the cannon approach playable.
  - Keep reward-relevant spawn counts/material classes where practical; otherwise reconcile score targets.

### I02. Add focused region-1 regression assertions
- Related Files: `apps/web/src/game/stages.test.ts` :: region-1 geometry/route checks; extend.
- Details: Assert stages 1–5 have distinct geometry/weak-point combinations based on spawn data, not route title strings. Retain bounds, target proximity, completeness, and score consistency checks.

## Acceptance Criteria
- [x] Stages 1–5 no longer share a near-identical silhouette or primary shot solution.
- [x] Both routes name reachable targets and match the stage instructions.
- [x] Campaign, story, form, ammo, timer, and clear flow remain intact; score changes are reconciled.
- [x] Focused test and web build pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- src/game/stages.test.ts`
- `npm.cmd run build --workspace @chicks-cannon/web`

## Commit Message
```text
스테이지 1~5 배치 다양화

Plan: 2026-10-30-stage-variety-redesign
Phase: P01-alley-and-rooftop
Task: T01-redesign-alley-stages

- 골목·성벽 스테이지의 구조와 공략 경로 분리
- 배치에 맞춰 안내와 점수 목표 정합성 유지
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 041bfe0

