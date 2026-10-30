# Task: T01 Validate Campaign Layout Identity

## Status: pending

## Goal
Validate all 20 stages together and replace tests that currently encode repeated-platform layouts with checks for distinct geometry and valid stage data.

## Decision Summary
- Preserve the 20-stage campaign, four regions/forms, stage-6 mid-boss, and stage-20 final boss.
- Every stage needs a distinct dominant geometry and a route-backed primary solution.
- Structural tests are a regression guard, not a substitute for observing people play.

## Implementation

### I01. Add campaign-wide identity and consistency checks
- Related Files:
  - `apps/web/src/game/stages.test.ts` :: campaign completeness, repeated-platform assertion, route/bounds/score checks; update.
  - `apps/web/src/game/stages.ts` :: `STAGES`; inspect all layouts and route copy; edit only if a mismatch remains.
  - `apps/web/src/game/constants.ts` :: `STAGE_SCORE_TARGETS`; reconcile with final spawn rewards.
- Details:
  - Replace the assertion that stages 5, 10, 15, and 19 have two same-height platforms; it encodes the repetition being removed.
  - Derive a normalized structural signature from actual block/cat/gimmick kinds, relative coordinates, and dimensions. Assert uniqueness after coarse quantization so tiny coordinate nudges cannot pass.
  - Retain checks for all 20 keys, region/form assignments, boss roles, complete stories/routes/challenges, in-bounds spawn centers, route proximity, and score-target consistency.
  - Reconcile all route hints and story instructions with actual spawned objects and plausible attack sequences.
  - Recalculate score targets if counts/materials/shields/bosses alter expected reward totals; document the retained score formula.
  - Add a manual review checklist to progress notes comparing all 20 geometry profiles and primary/secondary routes. Do not claim external playtesting.

### I02. Run full validation and record results
- Related Files:
  - `.memory/plans/2026-10-30-stage-variety-redesign.md` :: phase/task and commit progress; update.
  - `.memory/current.md` :: mark this plan complete only after all task commits and checks; update.
- Details:
  - Run the full web suite and production build after regional focused validations pass.
  - If validation fails, stop here, record the failed command/result, and leave the plan incomplete.
  - Record task commit hashes and final validation results in plan/phase progress.

## Acceptance Criteria
- [ ] No test requires the old repeated two-platform pattern.
- [ ] All 20 normalized structural signatures are distinct at a meaningful coarse scale.
- [ ] Route, bounds, score, region/form, and boss-role checks pass.
- [ ] Full web test suite and production build pass.
- [ ] Documentation distinguishes structural checks from human playtest evidence.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web` — all web tests pass.
- `npm.cmd run build --workspace @chicks-cannon/web` — TypeScript and production build pass.

## Commit Message
```text
20개 스테이지 배치 검증 강화

Plan: 2026-10-30-stage-variety-redesign
Phase: P03-campaign-validation
Task: T01-validate-campaign-layouts

- 반복 플랫폼 전제를 고유 배치 검증으로 교체
- 공략 경로와 점수 목표 정합성 확인
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending

