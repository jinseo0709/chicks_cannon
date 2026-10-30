# Task: T02 Redesign Rooftop and Clocktower Stages

## Status: done

## Goal
Give stages 6–10 distinct rooftop/clocktower silhouettes and make the mid-boss, clock-hand, gear, and bell encounters require different decisions.

## Decision Summary
- Keep region 2, stages 6–10, breeze chick, story beats, gimmicks, and progression.
- Stage 6 remains the mid-boss; stage 10 remains a regional finale, not a campaign ending.
- Preserve ammo, timers, and reward intent where practical; adjust score targets if spawn rewards change.

## Implementation

### I01. Author five distinct spawn layouts and route descriptions
- Related Files:
  - `apps/web/src/game/stages.ts` :: `STAGES[6]`–`STAGES[10]`, `fort`; edit spawn lists, routes, and instructions.
  - `apps/web/src/game/constants.ts` :: `STAGE_SCORE_TARGETS`; adjust if required by changed spawns.
- Details:
  - Distinguish the boss arena, wind-lift route, moving clock-hand crossing, gear rebound, and bell/chandelier sequence using different dominant shapes and primary targets.
  - Do not communicate difficulty by adding copies of the existing two-fort composition.
  - Ensure route targets exist and routes are physically plausible; keep all spawn centers in the 1280×720 world without unintended static overlap.

### I02. Add focused region-2 regression assertions
- Related Files: `apps/web/src/game/stages.test.ts` :: region-2 layout and boss-role assertions; extend.
- Details: Assert region-2 stages have distinct actual spawn profiles; retain stage completeness, bounds, route proximity, and score consistency checks.

## Acceptance Criteria
- [x] Stages 6–10 have distinct dominant layouts and attack sequences.
- [x] Stage 6 remains the region’s mid-boss and stage 10 does not trigger campaign-ending behavior.
- [x] Routes match reachable geometry and existing gimmicks.
- [x] Focused test and web build pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- src/game/stages.test.ts`
- `npm.cmd run build --workspace @chicks-cannon/web`

## Commit Message
```text
스테이지 6~10 배치 다양화

Plan: 2026-10-30-stage-variety-redesign
Phase: P01-alley-and-rooftop
Task: T02-redesign-rooftop-stages

- 옥상·시계탑 배치와 주 공략 순서 차별화
- 6스테이지 중간 보스 흐름 보존
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: aa53d02

