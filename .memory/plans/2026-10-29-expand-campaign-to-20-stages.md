# Plan: Expand the Campaign to 20 Stages

## Goal
Deliver a complete, sequential 20-stage campaign in four regions of five stages, using the existing six backgrounds and four chick forms, adding one signature gimmick per region, keeping stage 6 as a mid-boss and adding a stage-20 cat final boss. Preserve completion, best stars, and challenge badges in browser storage, and make the map browse one five-stage region at a time.

## Confirmed Decisions
- Stage numbers are 1–20 and unlock sequentially.
- Regions are 1–5 alley/wall, 6–10 rooftop/clocktower, 11–15 factory, 16–20 golden meadow.
- Rework the current six levels, reuse the six current backgrounds, retain the stage-6 cat as a mid-boss, and add a distinct cat final encounter at stage 20.
- Chick forms are baby (1–5), breeze (6–10), fighter (11–15), golden (16–20); the next regional form becomes available after clearing the preceding region.
- Persist completed stages, best star rating, and challenge badges across reloads.
- Every level has authored title, scene, story dialogue, two attack routes, spawn layout, score target, and bonus challenge. Difficulty rises gradually and mechanics vary within each region.
- Add region signature gimmicks: alley/wall trapdoor; rooftop/clocktower sweeping clock hand; factory conveyor; meadow flower launcher.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Define the 20-stage campaign, region/form/background mapping, stage content, and durable progress model. | [P01](../phases/2026-10-29-expand-campaign-to-20-stages/P01-campaign-data-and-progress/phase.md) |
| P02 | `done` | Implement four regional gimmicks and make boss behavior role-based for the stage-6 and stage-20 encounters. | [P02](../phases/2026-10-29-expand-campaign-to-20-stages/P02-gameplay-mechanics-and-bosses/phase.md) |
| P03 | `done` | Present the campaign as four five-node map pages and resume players from saved progress. | [P03](../phases/2026-10-29-expand-campaign-to-20-stages/P03-regional-world-map/phase.md) |
| P04 | `in_progress` | Update cross-cutting game and UI assumptions, complete campaign regression coverage, and validate the web app. | [P04](../phases/2026-10-29-expand-campaign-to-20-stages/P04-integration-and-validation/phase.md) |

## Execution Order
Complete tasks in phase order. P02 and P03 depend on the P01 stage/region contracts. P04 follows both and updates remaining hard-coded six-stage/final-boss behavior.
