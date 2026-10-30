# Task: T01 Redesign Factory Stages

## Status: pending

## Goal
Break the repeated dual-fort pattern in stages 11–15 and give the conveyor, tire, gear, shutter, and trampoline encounters individual structural identities.

## Decision Summary
- Keep region 3, stages 11–15, fighter chick, factory theme/story, conveyor signature mechanic, and progression.
- Use existing physics and gimmicks; do not add a new runtime mechanic.
- Preserve challenge/reward intent where practical and recalculate score targets if spawn rewards change.

## Implementation

### I01. Author distinct factory encounter shapes
- Related Files:
  - `apps/web/src/game/stages.ts` :: `STAGES[11]`–`STAGES[15]`, `fort`; edit layouts/routes/instructions.
  - `apps/web/src/game/constants.ts` :: `STAGE_SCORE_TARGETS`; adjust only if the reward basis changes.
- Details:
  - Design distinct problems: conveyor cargo/low support, tire rebound to an elevated target, gear-mediated gap, shutter timing through divided lanes, and a multi-mechanic assembly-line finale.
  - Replace near-identical side-by-side forts with different profiles such as offset platforms, suspended targets, stepped supports, separated lanes, or a central hazard corridor.
  - Make both route hints describe a plausible sequence through actual spawned targets.
  - Keep spawn centers within 1280×720 and avoid unintended static-spawn overlap.

### I02. Add focused region-3 regression assertions
- Related Files: `apps/web/src/game/stages.test.ts` :: region-3 layout and signature-gimmick checks; extend.
- Details: Assert stages 11–15 have distinct spawn/solution profiles and retain completeness, bounds, route-target, and score consistency checks.

## Acceptance Criteria
- [ ] Stages 11–15 no longer read as the same central fort plus a smaller right fort.
- [ ] Each regional mechanic has a distinct role in its stage’s target sequence.
- [ ] Routes and instructions match reachable targets.
- [ ] Focused test and web build pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- src/game/stages.test.ts`
- `npm.cmd run build --workspace @chicks-cannon/web`

## Commit Message
```text
공장 스테이지 배치 다양화

Plan: 2026-10-30-stage-variety-redesign
Phase: P02-factory-and-meadow
Task: T01-redesign-factory-stages

- 공장 스테이지의 요새 배치를 고유 구조로 재구성
- 컨베이어·타이어·기어·셔터 공략 순서 구분
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending

