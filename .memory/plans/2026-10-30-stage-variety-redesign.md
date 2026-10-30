# Plan: Redesign Stage Variety

## Goal
Redesign all 20 campaign encounters so each has a recognizable structure silhouette and distinct primary attack solution while preserving the established regions, forms, story, bosses, progression, and gimmicks.

## Confirmed Decisions
- Every stage gets a unique dominant silhouette and primary solution; regional gimmicks repeat/combine to retain familiarity.
- Keep four regions of five stages, regional chick forms, stage 6 mid-boss, stage 20 final boss, story, and progression.
- Recompose existing mechanics around each stage. Preserve ammo, timers, reward, and challenge intent where practical; update score targets when spawn reward data changes.
- Use existing `StageDefinition` and `SpawnSpec` unless the current contract blocks the design. Prefer authored spawns or purpose-built structural helpers over the repeated generic `fort()` composition.
- Validate each task before committing it with a Korean commit message.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ?` | Redesign alley/wall and rooftop/clocktower encounters. | [P01](../phases/2026-10-30-stage-variety-redesign/P01-alley-and-rooftop/phase.md) |
| P02 | `done ?` | Redesign factory and golden meadow encounters. | [P02](../phases/2026-10-30-stage-variety-redesign/P02-factory-and-meadow/phase.md) |
| P03 | `in_progress` | Validate campaign-wide layout identity, route hints, and score targets. | [P03](../phases/2026-10-30-stage-variety-redesign/P03-campaign-validation/phase.md) |

## Execution Order
Run P01-T01, P01-T02, P02-T01, P02-T02, then P03-T01. Each region task changes only its five-stage region and keeps the complete stage dataset valid. P03 owns final campaign-wide regression and build validation.

## Progress
- P01-T01 complete: stages 1–5 use distinct staircase, terraced bridge, trapdoor platform, stone arch, and timed gate layouts. Focused stage tests and build passed; Korean commit recorded in Git history.
- Remaining: P01-T02, P02-T01, P02-T02, P03-T01.

