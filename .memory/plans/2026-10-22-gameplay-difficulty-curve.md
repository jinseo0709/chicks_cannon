# Plan: Gameplay Difficulty Curve

## Goal
Implement the confirmed six-stage difficulty curve in the existing React and Matter.js game: teach one main gimmick per stage, provide the chosen ammunition and item budgets, reward stage-local score and efficient clears with persistent stars, make egg damage a score penalty, and communicate block damage and objectives clearly. The campaign total must remain correct across retries and replays.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Rebalance six stage definitions and implement stage-local scoring, retry resource rules, damage feedback, stars, HUD, and world-map records. | [P01](../phases/2026-10-22-gameplay-difficulty-curve/P01-campaign-progression/phase.md) |

## Scope
- Stage gimmicks: 1 basic structures; 2 shielded cats; 3 fan currents; 4 moving shutters; 5 TNT chains; 6 boss plus learned gimmicks.
- Stage ammo: 6, 6, 5, 5, 4, 5. Replenish one charge of each existing item at every stage entry and retry.
- Keep tires, gears, and chandeliers as secondary hazards in later stages.
- Add stage-start one-line mechanic instructions and safe first encounters.
- Show material-specific block damage; eggs no longer cause failure and instead subtract 500 from stage score, floored at zero.
- Star conditions: one for clearing; two for clearing with at least one shot left; three for clearing with at least half the initial ammo left and meeting the stage score target.
- Score targets use only points earned in the current stage. Show stage score and target progress prominently, campaign score secondarily.
- Persist completion and best stars in browser progress. Retry rolls the campaign score back to stage-entry value. Replaying a completed stage may improve its best stars but does not add replay score to the campaign total.

## Architecture and sequence
- P01-T01 revises `StageDefinition` content, ammo, gimmick teaching, and physical layouts.
- P01-T02 establishes the engine accounting model for campaign score, stage score, score target, stage-entry rollback, item refill, eggs, and star eligibility.
- P01-T03 renders damage states from entity HP and material without health bars.
- P01-T04 presents stage score/target in the HUD and star results on stage-clear UI.
- P01-T05 persists completion and best stars, displays them on the map, and covers cross-component campaign/replay behavior.
- Keep the existing leaderboard API contract and campaign-total score submission unchanged; only submit once the campaign ends, with replay points excluded.

## Validation Gates
1. For each Task, run its named Vitest specs and `npm run typecheck --workspace @chicks-cannon/web`; fix failures before moving to the next Task.
2. After P01-T05, run `npm test --workspace @chicks-cannon/web`, `npm run build --workspace @chicks-cannon/web`, and `git diff --check`.
3. Confirm manually that 320x740, 390x844, and 1440x900 layouts keep the stage score, target progress, ammo, item tray, clear stars, and map stars legible.
4. Confirm a fresh browser profile starts with no progress, while malformed stored progress safely falls back to no completions/stars.

## Progress
- done: 0/5 (active: P01-T01)
