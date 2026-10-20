# Task: T02 Matter.js 캠페인 엔진 및 규칙 이전

## Status: done

## Goal
첨부 HTML의 물리·스테이지·점수·승패 규칙을 React와 분리된 TypeScript 게임 엔진으로 이전해 4개 챕터가 동일한 핵심 플레이를 제공하도록 한다.

## Decision Summary
- Matter.js 0.19.0을 사용하고 가상 장면은 1280×720, gravity `{x: 0, y: 1.05}`로 고정한다.
- `C:\Users\유진서\Desktop\병아리대포_html.html`의 `CHICK_FORMS`, `STAGE_STORIES`, `loadStage`, `handleCollisions`, `launchChick`, `triggerChickSkill`, item handlers, `checkTurnSettlement`가 기준이다.
- 게임 상태 변경은 구독 가능한 엔진 snapshot으로 알린다. React 화면은 Matter.js 객체를 직접 수정하지 않는다.

## Implementation

### I01. 도메인 타입 및 캠페인 설정
- Related Files:
  - `apps/web/src/game/types.ts` :: `GameSnapshot`, `GameState`, `ChickForm`, `StageDefinition`, `GameEntityView`, `GameItemCounts` — 엔진 public contract; modify
  - `apps/web/src/game/constants.ts` :: `WORLD`, `CHICK_FORMS`, `STAGE_STORIES`, `BLOCK_CONFIG` — 공통 수치 및 텍스트; new
  - `apps/web/src/game/stages.ts` :: `STAGES` — 각 챕터 배치 데이터; new
  - `apps/web/src/game/stages.test.ts` :: stage completeness and spawn-data tests; new

#### Details
- **Signatures & Types**:
  ```typescript
  export type GameState = 'DIALOGUE' | 'AIMING' | 'FLYING' | 'RESOLVING' | 'WON' | 'LOST' | 'EVOLUTION' | 'ENDING';
  export type BlockKind = 'wood' | 'stone' | 'glass' | 'tnt';
  export type GimmickKind = 'fan' | 'trampoline' | 'boulder' | 'shutter';
  export type ItemKind = 'booster' | 'quake' | 'mega';
  export interface Point { x: number; y: number }
  export interface ChickForm { stage: 1|2|3|4; name: string; avatar: string; radius: number; density: number; skillName: string; skillDesc: string; bannerTip: string }
  export interface SpawnSpec { kind: 'block'|'cat'|'egg'|'shutter'|'fan'|'trampoline'|'boulder'; x: number; y: number; w?: number; h?: number; radius?: number; material?: BlockKind; boss?: boolean; shield?: boolean; minY?: number; maxY?: number; speed?: number; forceX?: number; forceY?: number }
  export interface StageDefinition { stage: 1|2|3|4; title: string; ammo: number; story: { speaker: string; avatar: string; text: string; chickReply: string }; spawns: readonly SpawnSpec[] }
  export interface GameSnapshot { state: GameState; stage: 1|2|3|4; score: number; ammo: number; items: Readonly<Record<ItemKind, number>>; muted: boolean; entities: readonly GameEntityView[]; aimPosition: Point|null; campaignComplete: boolean }
  ```
- `WORLD`: width 1280, height 720, cannon `(160,525)`, nest `(1150,620)`, maxDrag 125; Matter gravity y=1.05.
- Chick forms (name / skill / description / banner; avatar is `🐥`, `🐔`, `🐓`, `👑🐓` respectively):
  1. `아기 삐약이`, r17/density .003; `껍질 탄환`; `비행 중 탭하면 단단한 달걀 껍질을 발사해 장애물을 깹니다!`; `화면 탭: [껍질 탄환] 발사!`.
  2. `중닭 질풍이`, r22/.005; `질풍 부스터`; `강력한 날개짓으로 전방을 향해 초고속 관통 돌진합니다!`; `화면 탭: [질풍 부스터] 고속 돌진!`.
  3. `성체 싸움닭`, r27/.008; `메테오 급강하`; `수직으로 급강하 찍기를 시전하여 착탄 지점에 지진 충격을 줍니다!`; `화면 탭: [메테오 급강하] 수직 파쇄!`.
  4. `전설의 황금닭`, r34/.015; `황금 깃털 폭풍`; `황금빛 충격파를 폭발시켜 주변 요새와 적을 일격에 궤멸합니다!`; `화면 탭: [황금 깃털 폭풍] 대폭발!`.
- Block config `(fill,stroke,hp,density)`: wood `(#b45309,#78350f,32,.003)`, stone `(#64748b,#334155,75,.007)`, glass `(#7dd3fc,#0284c7,12,.0018)`, TNT `(#ef4444,#991b1b,18,.0018)`. All blocks friction .6, restitution .1; label TNT `tnt`, other blocks `block`.
- Enemy circle friction .6/restitution .2: boss density .006/hp60; shield .004/hp28; normal .0025/hp18. Egg circle radius14/density .002/friction .6/restitution .15/hp8.5. Shutters static with friction .2. Trampoline restitution1.85/friction.1. Boulder density.015/friction.05/restitution.1.
- Stage spawn data (x,y; dimensions/radii/materials) must match the original:
  - S1 ammo3: wood `(840,650,22,90)`, `(940,650,22,90)`, `(890,600,130,20)`; normal cat `(890,565,r23)`; glass `(840,530,20,85)`; `(940,530,20,85)`; wood `(890,480,130,20)`; normal cat `(890,445,r22)`.
  - S2 ammo3: shutter `(620,min310,max560,speed2,w24,h150)`; fan `(480,320,130,350,forceX .001,forceY -.007)`; trampoline `(740,680,110,25)`; stone `(900,650,24,100)`, wood `(1000,650,24,100)`, stone `(950,590,150,20)`, shield cat `(930,555,r25)`; glass `(900,510,22,90)`, wood `(1000,510,22,90)`, wood `(950,455,140,20)`, normal cat `(950,420,r23)`; wood `(1070,655,20,90)`, normal cat `(1070,595,r22)`.
  - S3 ammo4: stone `(730,460,20,160)`, wood `(770,400,100,20)`, boulder `(760,360,r28)`; egg `(960,570)`; stone `(890,650,26,90)`, TNT `(960,660,46,46)`, stone `(1030,650,26,90)`, stone `(960,600,180,22)`, shield cat `(890,555,r24)`, normal cat `(1030,555,r24)`; wood `(920,520,20,80)`, `(1000,520,20,80)`, glass `(960,470,120,20)`, boss `(960,435,r26)`.
  - S4 ammo4: shutter `(710,min290,max530,speed2.8,w26,h170)`; stone `(820,650,30,100)`, `(890,650,30,100)`, `(855,590,120,24)`, shield cat `(855,545,r26)`; egg `(940,650)`; fan `(600,220,130,380,forceX -.003,forceY -.003)`; stone `(1000,650,30,100)`, `(1100,650,30,100)`, `(1050,590,170,26)`, TNT `(1050,545,48,48)`; wood `(1010,490,24,80)`, `(1090,490,24,80)`, stone `(1050,440,140,22)`, boss `(1050,395,r34)`.
- Stage titles and full speaker/dialogue data:
  1. `골목길 쉼터`; speaker `골목대장 길고양이` / avatar `🐱`; `“푸하하! 이 푹신한 짚더미 둥지는 이제 내 낮잠 침대다냥! 덤벼봐라 꼬맹이!”`; reply `“내 소중한 둥지 돌려줘 삐약! 달걀 껍질 맛을 보여주마!”`.
  2. `환풍기 옥상`; speaker `옥상 경비 턱시도 고양이` / `😼`; `“여긴 환풍기 바람이 거세서 날아오지도 못할걸? 바람 타고 떨어져라!”`; reply `“중닭으로 진화한 내 날개짓을 얕보지 마라! 질풍 부스터 간다!”`.
  3. `폐공장 도미노`; speaker `요새 대장 불독 & 뚱냥이` / `😾`; `“철골과 바위, TNT로 둥지를 요새화했다냥! 여긴 절대 못 뚫는다!”`; reply `“내 불꽃 벼슬이 뜨겁게 타오른다! 메테오 급강하로 산산조각 내주마!”`.
  4. `황금 둥지 최종 결전`; speaker `보스 고양이 킹냥이` / `👑🐱`; `“마지막 방어선이다냥! 전설의 보물 둥지는 절대 넘겨줄 수 없다!”`; reply `“찬란한 황금빛 날개로 우리 가족의 보금자리를 되찾겠다 꼬끼오-!”`.

### I02. Engine lifecycle, physics, input intents, and scoring
- Related Files:
  - `apps/web/src/game/engine.ts` :: `ChickCannonEngine` — Matter world, state machine, collision, launch, skill, item and reset operations; new
  - `apps/web/src/game/engine.test.ts` :: engine lifecycle/rules tests; new

#### Details
- **Signatures & Types**:
  ```typescript
  export class ChickCannonEngine {
    constructor(onSnapshot: (snapshot: GameSnapshot) => void);
    startCampaign(): void;
    dismissDialogue(): void;
    setAim(position: Point): void;
    releaseAim(): void;
    activateSkill(): void;
    useItem(kind: ItemKind): void;
    toggleMute(): void;
    continueAfterEvolution(): void;
    retryStage(): void;
    restartCampaign(): void;
    step(deltaMs: number): void;
    getSnapshot(): GameSnapshot;
    dispose(): void;
  }
  ```
- Engine creation registers exactly one collisionStart listener. `loadStage(stage)` clears old bodies/listeners/timers/effects, resets per-stage ammo and transient state, retains campaign score and remaining items, then creates static ground `(640,695,2560,50)` and left wall `(-20,360,40,1440)` plus stage spawns. `startCampaign` resets stage=1, score=0, items `{booster:1,quake:1,mega:1}`, then opens story dialogue. Retry reloads current stage without resetting score/items. Restart campaign resets all.
- Drag aim only starts within 90px of cannon; clamp drag to radius125. Launch only if AIMING, ammo>0, drag distance>=15. Velocity power=`min(distance,125)/125 * (stage4?31:stage3?28:26)`, angle=`atan2(cannonY-dragY,cannonX-dragX)`; decrement ammo and set FLYING. Mega item multiplies radius1.8 and density3.5 for next shot.
- Collision: relative speed `hypot(vA-vB)*3.5*formMultiplier`, multiplier stage1=1, stage2=1.8, stage3=2.8, stage4=4.5 when active chick is involved. Blocks take damage for impact>5; one-time destruction grants 180 except TNT explosion (radius230, force.14, +600). Cats take damage for impact>4.5; shield frontal direct chick hit reflects, except overhead debris. Cat rewards: boss3000, shield2000, normal1200. Egg takes impact damage above3.2 and fails if hp<=0 or body falls below ground threshold y>685. Collision-generated effects/shake/sounds use callbacks, not DOM mutation.
- Per-stage skill may be used once per shot: stage1 spawns three egg shells with velocities `(chick.vx+18,chick.vy+i*4)` for i=-1..1; stage2 dash velocity `(max(vx*1.6,26),vy*.4)`; stage3 velocity `(vx*.8,28)`; stage4 explosion radius300/force.22. Booster only while FLYING multiplies x velocity by1.8 with min30 and y by.2. Quake applies random x force range±.04 and upward y force -.06..-.10 to dynamic non-chick bodies. Mega only while AIMING.
- Turn settles after speed<.65 or out-of-bounds remains true >50 simulation frames. If all cats eliminated, stage becomes WON, emits nest celebration, then advances to EVOLUTION for stages1–3 or ENDING after stage4. If ammo exhausted first, state LOST; otherwise next shot returns to AIMING. Egg destruction immediately enters LOST.
- `step(deltaMs)` caps long frame deltas to avoid tab-resume physics jumps, runs `Engine.update`, advances moving shutters/wind, checks settlement, and emits one immutable snapshot after the update.
- No campaign save/restore. No external calls in the engine.

### I03. Rule tests
- Related Files:
  - `apps/web/src/game/engine.test.ts` :: named test cases — deterministic engine behavior; new
  - `apps/web/src/game/stages.test.ts` :: stage coordinate and spawn counts; new
- Test scenarios: stage data has exactly four records and known ammo counts 3/3/4/4; launch clamps drag and consumes one ammo; release under 15px does not launch; skill can be used only once per chick; each item obeys its state/quantity gate; retry preserves score/items while restart resets them; one remaining enemy prevents stage clear; all enemies cleared enters WON; egg break enters LOST; campaign stage4 clear enters ENDING. Use seeded/random injection or narrow exported pure functions for random-force assertions.

## Acceptance Criteria
- [ ] Four stages spawn the exact source geometry/materials, including fans, shutters, trampoline, boulder, shield cats, TNT and eggs.
- [ ] Campaign score, ammunition, skill gates, item counts, retry/restart, win/lose/evolution/ending transitions follow the original rules.
- [ ] Engine cleanup removes Matter listeners/bodies and cancels timers; no duplicate loop or stale callbacks remain after reset/dispose.
- [ ] Deterministic unit tests cover launch, state transitions, item/skill gates and stage data.

## Validation
- `npm test --workspace @chicks-cannon/web -- --run src/game` — game model/engine tests pass.
- `npm run typecheck --workspace @chicks-cannon/web` — strict TS check passes.

## Commit Message
```text
feat(game): port four chapter Matter.js campaign rules

Plan: 2026-10-20-chicks-cannon-react
Phase: P01-react-game
Task: T02-game-engine

- Model chapter layouts and chick evolution as typed game data
- Port collision scoring, skills, items, and campaign state transitions
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(game): port four chapter Matter.js campaign rules

