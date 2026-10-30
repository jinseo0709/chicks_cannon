# Task: T01 Implement Regional Gimmick Physics

## Status: done

## Goal
Make each new regional gimmick a deterministic, visible-in-state physics interaction that can be authored through `SpawnSpec` and played with the existing cannon physics engine.

## Decision Summary
- Trapdoor is an impact-triggered hinged platform; clock hand is a rotating hazard/platform; conveyor applies horizontal surface force; flower launcher gives contacted bodies an upward impulse.
- Gimmicks are authored explicitly in `STAGES`; no random placement or stage-number special cases.
- Continue to use the current Matter.js world and engine lifecycle.

## Implementation

### I01. Add state and collision behavior for the four gimmicks
- Related Files:
  - `apps/web/src/game/types.ts` :: `GimmickKind`, `SpawnSpec`, snapshot/entity types; modify.
  - `apps/web/src/game/engine.ts` :: `spawn`, per-tick updates, collision handling, `createSnapshot`; modify.
  - `apps/web/src/game/engine.test.ts` :: physics interaction tests; modify.
- Details
  - Use these shape fields from `SpawnSpec`: `trapdoor: x,y,w,h,anchor,triggerImpact`; `clockHand: x,y,w,h,anchor,angularSpeed`; `conveyor: x,y,w,h,forceX`; `flowerLauncher: x,y,radius,forceY`. Existing fields `x/y/w/h/radius/anchor/angularSpeed/forceX/forceY` remain the source; `triggerImpact` is optional and applies only to trapdoor.
  - Add optional, serializable gimmick state to `GameEntityView.customData`: `triggered?: boolean`, `spent?: boolean`, `direction?: 1|-1`. Snapshot state must include enough data for rendering after each tick; do not expose Matter body references.
  - Trapdoor spawns as a static rectangular platform at its authored angle. When a dynamic body collision's normal impact speed is at least `triggerImpact` (default 5 world units/s), set `triggered=true` once, convert it to a hinged dynamic body using its authored anchor, and allow gravity to rotate it down by 85 degrees. It remains open for the rest of that stage attempt.
  - Clock hand spawns as a static rectangle centered on `(x,y)` with pivot at `anchor`; on every fixed simulation tick rotate by `angularSpeed` radians per second about pivot. Clamp only by simulation's existing time-step; preserve sign for clockwise/counterclockwise. It may transfer impact to dynamic objects but does not damage or delete them.
  - Conveyor is a static platform. In collision resolution, if a dynamic body is in contact with its top face, apply horizontal impulse `forceX * deltaSeconds` to its velocity each tick, clamped to absolute horizontal velocity 12; apply equally to chick, cats, eggs, and blocks. Do not affect bodies touching a side/bottom face.
  - FlowerLauncher is a static circular sensor/platform. On the first top-surface contact per body, add upward velocity `-abs(forceY)` and mark that body as spent for this launcher until it exits its sensor; allow future recontact after exit. Never launch bodies on side contact. `forceY` is authored as positive magnitude.
  - Add all new types to existing gimmick spawn switch, collision filters, clear/reset lifecycle, and snapshot conversion. Missing optional numeric fields use the defaults above (except conveyor/launcher magnitude defaults to 8), and reject non-finite values by falling back to default.
- Execution Flow / Logic
  1. Validate dimensions and optional authored numeric values before creating the Matter body; invalid/nonpositive width, height, radius, or nonfinite angle/speed uses the engine's established safe fallback or omits the malformed spawn, never creates NaN geometry.
  2. Create the proper static/dynamic/sensor body and seed `customData` with deterministic state.
  3. Run updates in the fixed-step loop; process collisions after the physics step and before publishing snapshots.
  4. Reset transient states whenever `loadStage` resets the world; preserve nothing between stage attempts.

### I02. Verify gameplay contracts with engine tests
- Related Files:
  - `apps/web/src/game/engine.test.ts` :: deterministic gimmick behaviors; modify.
- Details
  - Add isolated cases for trapdoor trigger-once and hinge rotation, both clockHand angular directions, conveyor top-only movement and speed clamp, flowerLauncher top-only single launch/relaunch only after separation, snapshot serializability, and stage reload reset.

## Acceptance Criteria
- [ ] All four gimmicks use data-driven spawns and affect bodies according to the specified contact rules.
- [ ] Missing/invalid optional values never create nonfinite physics state.
- [ ] State resets between stage attempts and snapshots remain serializable.
- [ ] Engine gimmick tests pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- engine.test.ts` — new gimmick physics cases and existing engine cases pass.

## Commit Message
```text
feat(gameplay): add four regional stage gimmicks

Plan: 2026-10-29-expand-campaign-to-20-stages
Phase: P02-gameplay-mechanics-and-bosses
Task: T01-implement-regional-gimmick-physics

- Implement trapdoor, clock hand, conveyor, and flower launcher behavior
- Reset gimmick state with the stage physics world
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
