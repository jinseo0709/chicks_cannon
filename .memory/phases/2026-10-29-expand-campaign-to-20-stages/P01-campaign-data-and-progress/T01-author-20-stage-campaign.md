# Task: T01 Author the 20-Stage Campaign

## Status: done

## Goal
Replace the six-entry campaign definition with a type-safe, fully authored 20-stage dataset grouped into four regions, with exact stage, form, scene, score, challenge, and signature-mechanic assignments so gameplay and map work can consume one source of truth.

## Decision Summary
- The four regions are stages 1–5 alley/wall, 6–10 rooftop/clocktower, 11–15 factory, 16–20 golden meadow.
- Forms are baby, breeze, fighter, and golden respectively; forms change only at region boundaries.
- Reuse the six existing themes/backgrounds by mapping stages 1–3 to alley-day, 4–5 wall-afternoon, 6–8 rooftop-sunset, 9–10 clock-twilight, 11–15 factory-night, and 16–20 meadow-gold.
- New signature gimmick kinds and runtime behavior are implemented in P02; this task declares their types and authors their spawn specs.

## Implementation

### I01. Define 20-stage, region, boss, and gimmick contracts
- Related Files:
  - `apps/web/src/game/types.ts` :: `GameStage`, `SceneTheme`, `GimmickKind`, `SpawnSpec`, `StageDefinition`; modify.
  - `apps/web/src/game/constants.ts` :: `STAGE_ORDER`, `LAST_STAGE`, `STAGE_SCORE_TARGETS`, `STAGE_FORMS`, `CHICK_FORMS`; modify.
  - `apps/web/src/game/stages.ts` :: `STAGES`; modify.
- Details
  - `GameStage` must be the union `1 | 2 | ... | 20`.
  - Export `REGION_ORDER = [1, 2, 3, 4] as const`, `RegionId = 1 | 2 | 3 | 4`, and `REGIONS: Readonly<Record<RegionId, { id: RegionId; title: string; firstStage: GameStage; lastStage: GameStage; theme: SceneTheme; backgroundStage: 1|2|3|4|5|6; formId: ChickFormId; gimmick: GimmickKind }>>`. Region titles: `골목과 성벽`, `지붕과 시계탑`, `기계 공장`, `황금 초원`. The backgroundStage values are 1, 3, 5, 6.
  - Add optional `region: RegionId` and `bossRole?: 'mid' | 'final'` to `StageDefinition`. Add `trapdoor`, `clockHand`, `conveyor`, `flowerLauncher` to `GimmickKind`; add optional `triggerImpact?: number` to `SpawnSpec` for trapdoor trigger threshold.
  - `STAGE_ORDER` is exactly `[1,...,20]`, `LAST_STAGE` is 20. Set form by region boundaries 1–5 baby, 6–10 breeze, 11–15 fighter, 16–20 golden. `CHICK_FORMS` remains derived from the form table and stage order.
  - Set score targets by stage order to `[3600,3900,4200,4500,4800,5100,5400,5700,6000,6300,6600,6900,7200,7500,7800,8100,8400,8700,9000,10000]`; make `STAGES[stage].region` agree with `REGIONS`. This preserves stage 1's current threshold and gives later regions a gradual rise.
  - Keep the existing `StageDefinition` field contract: `stage`, `theme`, `title`, `ammo`, `bonusChallenge {timeLimitMs, bonusScore, badge}`, `attackRoutes` tuple of two `{name,hint,target}`, `story {speaker,avatar,text,chickReply,instruction}`, and `spawns`.
- Execution Flow / Logic
  1. Preserve the existing spawn helper conventions and physics-compatible coordinates from `stages.ts`; every entry stays a complete `StageDefinition` and stage keys equal `stage`.
  2. Rewrite all old stage definitions into the new stage identities; do not leave old stage 6 as campaign-ending finale. Stage 6 is the rooftop mid-boss with `bossRole: 'mid'`; stage 20 is final with `bossRole: 'final'`.
  3. Build levels from the following authored design table. For each row use `ammo` as listed, and write the two route names/hints/targets and story dialogue to teach the named route/mechanic. Both routes must be physically achievable from the listed spawn layout. All levels have exactly one bonus challenge; use the listed time limit / bonus score / badge text. Keep text Korean and concise in the existing character voice.

| Stage | Theme | Title | Ammo | Core layout and progression beat | Bonus challenge (time ms / score / badge) |
|---:|---|---|---:|---|---|
| 1 | alley-day | 골목의 첫 발사 | 6 | Tutorial: low block stack, one cat, one egg; unobstructed direct route. | 35,000 / 300 / 첫 출발 |
| 2 | alley-day | 빨랫줄 골목 | 6 | Two offset block stacks, two cats, egg placed beyond a breakable line. | 38,000 / 350 / 빨랫줄 돌파 |
| 3 | alley-day | 여닫이 바닥 | 6 | First trapdoor tutorial, one cat on its far side, low block shield. | 40,000 / 400 / 바닥 뒤집기 |
| 4 | wall-afternoon | 성벽의 돌무더기 | 5 | Boulder plus stacked masonry and two separated cats; teach force route. | 42,000 / 450 / 성벽 돌파 |
| 5 | wall-afternoon | 성문 아래 비밀길 | 5 | Trapdoor plus shutter and three cats; region capstone layout, no boss. | 45,000 / 500 / 골목의 영웅 |
| 6 | rooftop-sunset | 지붕 위의 고양이 대장 | 5 | Existing cat boss encounter redesigned as mid-boss; no stage-20 chandelier weakpoint dependency. | 50,000 / 550 / 첫 승리 |
| 7 | rooftop-sunset | 바람 타는 옥상 | 5 | Fan pushes across roof, two cats at different heights, one block brace. | 45,000 / 550 / 바람길 질주 |
| 8 | rooftop-sunset | 시계손의 그림자 | 5 | First clockHand tutorial; one cat behind a narrow timing window. | 48,000 / 600 / 시계손 통과 |
| 9 | clock-twilight | 톱니 시계탑 | 4 | ClockHand, gear, and shielded cat; route requires timing plus ricochet. | 50,000 / 650 / 톱니 틈새 |
| 10 | clock-twilight | 종소리 꼭대기 | 4 | ClockHand and chandelier swing hazards with three cats; region capstone. | 52,000 / 700 / 옥상의 질주 |
| 11 | factory-night | 공장 가동 | 5 | Conveyor tutorial, two cats and low blocks; belt moves objects toward a safe launch lane. | 48,000 / 700 / 첫 생산품 |
| 12 | factory-night | 타이어 시험장 | 5 | Tire bounce plus conveyor and elevated cat. | 50,000 / 750 / 반동 전문가 |
| 13 | factory-night | 기어 압착기 | 4 | Gear, conveyor, shielded cat, safe opening to learn timing. | 52,000 / 800 / 기어 틈새 |
| 14 | factory-night | 셔터 작업장 | 4 | Timed shutter plus conveyor and separated block stacks. | 55,000 / 850 / 셔터 돌파 |
| 15 | factory-night | 마지막 조립 라인 | 4 | Conveyor, gear, trampoline, three cats; region capstone, no boss. | 58,000 / 900 / 공장 탈출 |
| 16 | meadow-gold | 민들레 발사대 | 5 | FlowerLauncher tutorial, two cats at increasing height, simple blocks. | 50,000 / 900 / 꽃바람 |
| 17 | meadow-gold | 황금빛 시소 | 4 | Seesaw and FlowerLauncher form two valid routes. | 52,000 / 950 / 균형 잡기 |
| 18 | meadow-gold | 바위 정원 | 4 | Boulder, flower launcher, shielded cats; use trajectory rather than brute force. | 55,000 / 1000 / 정원 돌파 |
| 19 | meadow-gold | 고양이 왕의 문턱 | 4 | Final-boss approach with chandelier/flower launch route, durable block defense, no boss entity. | 58,000 / 1100 / 결전 준비 |
| 20 | meadow-gold | 황금 초원의 고양이 왕 | 5 | New cat final boss with explicit `bossRole: 'final'`, boss health, and a distinct route/weakpoint sequence; use a stage-20 cat spawn with `boss: true`. | 75,000 / 1500 / 초원의 수호자 |

  - Existing gimmicks allowed in the layouts are fan, trampoline, boulder, shutter, tire, gear, chandelier, and seesaw. Ensure each new signature appears at least twice inside its region, including its tutorial stage. Keep coordinate bounds within the existing world dimensions and avoid overlapping static spawn hitboxes.
  - Build all layouts in the existing 1280×720 world with cannon at `(160,525)` and nest at `(1205,620)`. For a baseline target fort, use two supports centered at `x=850` and `x=990`, `y=620`, `28×100`; one deck centered `(920,558)`, `190×22`; two cats at `(875,522)` and `(970,522)`, radius 24; two upper supports centered at `x=875` and `965`, `y=505`, `26×84`; upper deck `(920,454)`, `142×22`; upper cat `(920,418)`, radius 24. Vary or extend this structure according to each row's named layout and region mechanic. Place region gimmicks on the approach/side lanes, not intersecting the fort's static bodies. This reuses the proven scale and placement of existing stage spawns while giving each level its own layout.
  - For the two routes, author an explicit target point on the intended weak support or gimmick, name the target in `name`, and explain the expected trajectory/interaction in `hint`. Route 1 is the direct/low route; route 2 uses the region gimmick, upper structure, or ricochet route as specified in the row. Stage 20 route 1 targets the lower boss defense and route 2 targets its final chandelier weakpoint.
  - Use these narrative beats for each stage's `story` fields: speaker is the named stage opponent or obstacle character, `text` presents the stage conflict in one playful Korean sentence, `chickReply` answers with confidence and one character voice, `instruction` gives the row's concrete mechanic/route hint. Stage 6 dialogue calls the cat an early checkpoint rival, never the final enemy; stage 20 dialogue calls the cat the king and final opponent. Use the stage title to give each entry a distinct identity.
  - Populate `bonusChallenge.badge` exactly as the table shows. Set each `bonusScore` to its listed value and `timeLimitMs` to its listed value.
  - Add concise entries for every spawn as actual `SpawnSpec` data; do not use runtime random generation.

### I02. Update campaign-data tests
- Related Files:
  - `apps/web/src/game/stages.test.ts` :: campaign data assertions; modify.
  - `apps/web/src/game/asset-cache.ts` :: `stageAssetIds`; modify.
  - `apps/web/src/game/asset-cache.test.ts` :: stage-to-background assertions; modify.
  - `apps/web/src/App.test.tsx` :: home → map → stage entry smoke coverage and revised stage-1 dialogue name; modify.
- Details
  - Asset IDs remain the six existing background IDs. `stageAssetIds(stage)` resolves background using `REGIONS[stage.region].backgroundStage`, preserving `chick-${CHICK_FORMS[stage].formId}`.
  - Test all 20 ordered keys, four groups of five, stage 6 mid boss, stage 20 final boss, regional form assignments, theme-to-region assignments, nonempty title/story/routes/spawns, strictly increasing score targets, and valid gimmick kinds.
  - Update old tests that assert six levels, six unique themes, old ammo sequence, or old form cadence.

## Acceptance Criteria
- [ ] `STAGES` contains exactly stages 1–20, each with complete playable authored fields and matching `stage` key.
- [ ] All region, form, theme, score target, boss role, and signature-gimmick assignments match the table/contracts above.
- [ ] Stage assets resolve only to existing background variants 1–6 and correct form sprites.
- [ ] Stage-data and asset-cache tests pass.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- stages.test.ts asset-cache.test.ts` — campaign data and asset mapping tests pass.
- `npm.cmd run build --workspace @chicks-cannon/web` — TypeScript and production build pass.

## Commit Message
```text
feat(campaign): author 20 stages across four regions

Plan: 2026-10-29-expand-campaign-to-20-stages
Phase: P01-campaign-data-and-progress
Task: T01-author-20-stage-campaign

- Expand stage, region, form, theme, and gimmick contracts
- Author 20 complete stage layouts and map reused backgrounds
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
