# Task: T01 Stage Design and Ammo

## Status: done

## Goal
Make the six authored stages teach the agreed mechanics in order and use the exact shot budgets, with a safe first encounter and clear start-dialogue instruction for each new gimmick.

## Decision Summary
- Ammo by stage is exactly 6, 6, 5, 5, 4, 5.
- Main gimmick order: basic blocks, shielded cats, fans, moving shutters, TNT chains, then boss plus earlier gimmicks. Tires, gears, and chandeliers remain secondary hazards in later stages.
- Each stage should contain one large fort and one smaller auxiliary structure, offer multiple attack angles, and permit physical chain-reaction solutions.

## Implementation

### I01. Stage content and ammo
- Related files:
  - `apps/web/src/game/stages.ts` :: `STAGES`, `block`, `cat`; modify stage definitions.
  - `apps/web/src/game/types.ts` :: `StageDefinition`, `SpawnSpec`; modify only if a typed tutorial field is needed.
  - `apps/web/src/game/stages.test.ts` :: stage content assertions; modify.
- Details:
  - Set `STAGES[1..6].ammo` to 6, 6, 5, 5, 4, 5.
  - Rework stage contents so Stage 1's first structure is basic and safe to attempt; Stage 2 makes shield layers readable and central; Stage 3 introduces the fan as its primary mechanic; Stage 4 introduces shutter timing; Stage 5 introduces TNT chain reactions; Stage 6 combines the boss with fans, shields, shutter, TNT, and retained auxiliary hazards.
  - Preserve the existing `SpawnSpec` physics semantics. Coordinates are in the existing 1280 by 720 world (`WORLD` in `constants.ts`); keep support fixtures and cats above the existing ground plane and avoid overlapping static bodies unintentionally.
  - Use one primary fort and one smaller side structure per stage. Keep a clear safe first interaction with that stage's primary gimmick; challenge can come from later placements in the same stage.
  - Keep tires, gears, chandeliers as support hazards in later stages without making them the first or only lesson.
- Acceptance criteria:
  - A table-driven stage test asserts exact ammo values and required primary gimmicks.
  - Each stage's authored spawns include multiple plausible attack routes and no new gimmick's first interaction requires precision timing or an unsafe egg sacrifice.

### I02. Stage-start instruction text
- Related files:
  - `apps/web/src/game/stages.ts` :: `StageDefinition.story`; modify text.
  - `apps/web/src/components/DialoguePanel.tsx` :: existing stage dialogue; read-only unless stage-specific instruction cannot fit existing story fields.
  - `apps/web/src/game/stages.test.ts` :: instruction coverage; modify.
- Details:
  - Add one concise Korean instruction in the existing stage-start dialogue for the new mechanic in stages 2 through 5. Stage 1 may instruct aiming at supports; Stage 6 should remind players to combine earlier mechanics.
  - Keep the existing dialogue panel and its speaker/avatar/reply structure. Do not add a separate tutorial screen.
  - Verify the instruction describes an action a player can try immediately in the opening safe encounter.
- Acceptance criteria:
  - Every stage has non-empty, stage-appropriate guidance and the existing dialogue renderer displays it without schema changes unless explicitly required.

## Validation
- `npm test --workspace @chicks-cannon/web -- stages.test.ts`
- `npm run typecheck --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(levels): rebalance gimmick stages and ammunition

Plan: 2026-10-22-gameplay-difficulty-curve
Phase: P01-campaign-progression
Task: T01-stage-design-and-ammo

- Set the confirmed ammunition curve and teach gimmicks in order
- Arrange safe first encounters and multi-route structures
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`stages.test.ts`: 16 passed; web typecheck; `git diff --check`)
- commit: pending
