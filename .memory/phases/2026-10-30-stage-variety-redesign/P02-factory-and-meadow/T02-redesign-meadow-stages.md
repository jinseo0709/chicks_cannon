# Task: T02 Redesign Golden Meadow Stages

## Status: pending

## Goal
Give stages 16–20 different meadow silhouettes and approach sequences, ending in a boss arena distinct from the preceding gate encounter.

## Decision Summary
- Keep region 4, stages 16–20, golden chick, story, flower-launcher signature mechanic, and stage-20 final boss.
- Reuse existing mechanics/assets; no new mechanic or background is required.
- Preserve challenge/reward intent where practical; recalculate score targets if spawn rewards change.

## Implementation

### I01. Author five distinct meadow encounter shapes
- Related Files:
  - `apps/web/src/game/stages.ts` :: `STAGES[16]`–`STAGES[20]`, `fort`; edit layouts/routes/instructions.
  - `apps/web/src/game/constants.ts` :: `STAGE_SCORE_TARGETS`; adjust only when required by spawn rewards.
- Details:
  - Give launcher, seesaw, boulder, chandelier/gate, and final king encounters different silhouettes and target sequences.
  - Avoid minor variations of the central/right fort pair across stages 17–19.
  - Keep the stage-20 arena boss-centered; its routes must address the lower defense and final weak point.
  - Keep routes plausible, spawn centers in bounds, and static bodies free of unintended overlap.

### I02. Add focused region-4 regression assertions
- Related Files: `apps/web/src/game/stages.test.ts` :: region-4 layouts and final-boss checks; extend.
- Details: Assert distinct stage 16–20 profiles and retain completeness, bounds, route-target, and score consistency checks.

## Acceptance Criteria
- [ ] Stages 16–20 have distinct silhouettes and primary attack sequences.
- [ ] The flower launcher remains a repeated signature with varied uses.
- [ ] Stage 20 remains the only final boss and has a dedicated layout.
- [ ] Focused test and web build pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- src/game/stages.test.ts`
- `npm.cmd run build --workspace @chicks-cannon/web`

## Commit Message
```text
초원 스테이지와 최종 보스 배치 차별화

Plan: 2026-10-30-stage-variety-redesign
Phase: P02-factory-and-meadow
Task: T02-redesign-meadow-stages

- 초원 스테이지의 주 기믹과 요새 실루엣 분리
- 20스테이지 최종 보스 전용 공략 구조 구성
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending

