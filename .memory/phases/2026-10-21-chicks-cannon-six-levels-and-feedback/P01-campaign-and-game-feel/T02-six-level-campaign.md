# Task: T02 6단계 캠페인과 형태·스킬 데이터 분리

## Status: pending

## Goal
T01의 실제 장애물을 쓰는 최종 6개 레벨을 구성하고, 같은 병아리 형태가 두 레벨에 걸쳐 이어져도 스킬·발사·피해·엔딩·이미지 로딩이 올바르게 동작하게 한다.

## Decision Summary
- 레벨 순서는 1~6, 성장 형태는 baby/breeze/fighter/golden의 4종이다. 모든 단계 번호 조건을 무작정 6으로 바꾸지 않고 형태 데이터에서 스킬·파워·배율을 읽는다.
- 최종 장면 그림은 T06, Canvas 캐릭터는 T05다. 이 Task에서도 기존 4개 그림을 매핑해 새 레벨이 빈 장면이나 없는 SVG 경로가 되지 않게 한다.

## Implementation

### I01. 공통 타입·형태 상수·자원 매핑
- Related Files:
  - `apps/web/src/game/types.ts` :: `GameStage`, `ChickForm`, `StageDefinition`, `GameEntityView` — 레벨/형태 필드; modify
  - `apps/web/src/game/constants.ts` :: `CHICK_FORMS`, 신규 `STAGE_ORDER`, `LAST_STAGE` — 공통 진행 기준; modify
  - `apps/web/src/game/asset-cache.ts` :: `stageAssetIds` — 6단계→4형태 이미지; modify
  - `apps/web/src/game/renderer.ts` :: `drawBackground`, `drawGround`, `drawSprite`, `drawAimGuide` — 임시 호환과 파워 공유; modify

#### Details
- **Signatures & Types**:
  ```ts
  type GameStage = 1 | 2 | 3 | 4 | 5 | 6;
  type ChickFormId = 'baby' | 'breeze' | 'fighter' | 'golden';
  type SkillKind = 'shell' | 'boost' | 'meteor' | 'feathers';
  type SceneTheme = 'alley-day' | 'wall-afternoon' | 'rooftop-sunset' | 'clock-twilight' | 'factory-night' | 'meadow-gold';
  // ChickForm의 기존 필드를 유지하고 다음 필드 추가(모두 non-null).
  interface FormMetadata { formId: ChickFormId; skillKind: SkillKind; launchPower: number; damageMultiplier: number; assetVariant: 1 | 2 | 3 | 4; }
  // StageDefinition에 theme:SceneTheme 추가.
  // GameEntityView 및 GameBody.customData에 projectile?:'shell'|'feather', expiresAtMs?:number 추가.
  const STAGE_ORDER: readonly GameStage[];
  const LAST_STAGE: GameStage; // 6
  ```
- `CHICK_FORMS:Readonly<Record<GameStage,ChickForm>>`는 기존 API를 유지하되 단계별 `.stage`는 해당 레벨, 공통 형태 데이터는 아래 표로 만든다. 단계별 성장 정보를 별도 복사해 여러 값을 수정하는 패턴은 피한다. `.formId`로 실제 진화 여부를 비교한다.

| Levels | formId/name/avatar | radius/density | skillKind/skillName | launchPower/damageMultiplier/assetVariant |
| :--- | :--- | :--- | :--- | :--- |
| 1,2 | baby / 아기 삐약이 / 🐥 | 17 / 0.003 | shell / 껍질 탄환 | 26 / 1 / 1 |
| 3,4 | breeze / 중닭 질풍이 / 🐔 | 22 / 0.005 | boost / 질풍 부스터 | 26 / 1.8 / 2 |
| 5 | fighter / 성체 싸움닭 / 🐓 | 27 / 0.008 | meteor / 메테오 급강하 | 28 / 2.8 / 3 |
| 6 | golden / 전설의 황금닭 / 👑🐓 | 34 / 0.015 | feathers / 황금 깃털 폭풍 | 31 / 4.5 / 4 |

- 기존 skillDesc/bannerTip를 shell/boost/meteor에 맞춰 유지. golden은 각각 `황금 깃털을 전방으로 펼쳐 요새를 관통합니다!`, `화면 탭: [황금 깃털 폭풍] 발사!`로 교체한다.
- `stageAssetIds(stage:GameStage):readonly AssetId[]`는 background/chick ID를 `CHICK_FORMS[stage].assetVariant`로 매핑한다(새 background-5/chick-6 파일을 만들지 않음). renderer sprite도 같은 variant를 사용한다. T05에서 캐릭터는 Canvas 기본 경로로 전환된다.
- 임시 배경은 theme에 따라 기존 함수 재사용: alley-day/wall-afternoon→ChapterOne, rooftop-sunset→ChapterTwo, clock-twilight/factory-night→ChapterThree, meadow-gold→ChapterFour. drawGround도 대응하는 동일 테마로 매핑한다. T06가 afternoon/twilight를 독립 그림으로 교체한다. 축제 입자는 6장에만 보인다.

### I02. 정확한 여섯 레벨 데이터
- Related Files:
  - `apps/web/src/game/stages.ts` :: `STAGES` — 최종 기본 배치; modify
  - `apps/web/src/game/stages.test.ts` :: 데이터 완전성과 초기 안정성; modify

#### Details
- **Data & Schema Fields**: 각 레벨은 `stage,title,theme,ammo,story:{speaker,avatar,text,chickReply},spawns`를 모두 가진다. 좌표계1280×720, 물리 ground top670이다. 다음 표기법은 정확한 SpawnSpec 청사진이다: `B(x,y,w,h,material)`, `C(x,y,radius,shieldLayers=0,boss=false,hp=기본값)`, `E(x,y)`(반지름14), `T(x,y,radius)`(tire), `G(x,y,radius,angularSpeed)`(gear), `H(x,y,w,h,anchorX,anchorY)`(chandelier), `S(x,y,w,h,minY,maxY,speed)`(shutter), `F(x,y,w,h,forceX,forceY)`(fan). C는 shieldLayers>0일 때 shield:true도 넣는다. 표에 없는 레거시 trampoline/boulder는 새 배치에 억지로 추가하지 않는다(T01 호환 코드는 유지).

| Level / title / theme / ammo | spawns (순서대로 생성) |
| :--- | :--- |
| 1 / 골목길 입구 / alley-day / 3 | B(850,620,24,100,wood); B(970,620,24,100,wood); B(910,560,150,20,wood); C(875,528,22); C(945,528,22) |
| 2 / 도둑고양이 담장 / wall-afternoon / 3 | T(650,630,40); B(880,630,26,80,wood); B(1000,630,26,80,wood); B(940,580,150,20,wood); C(930,545,25,1); C(1080,646,24) |
| 3 / 바람 부는 고층 옥상 / rooftop-sunset / 4 | F(470,420,140,420,0,-0.0015); S(650,390,24,150,300,480,2); B(900,620,26,100,stone); B(1020,620,26,100,wood); B(960,560,160,20,stone); C(930,526,24,1); C(990,526,24); B(1060,645,36,50,glass); C(1104,646,24) |
| 4 / 위험천만 시계탑 / clock-twilight / 4 | G(620,450,50,0.025); H(780,330,100,36,780,190); B(910,620,28,100,stone); B(1050,620,28,100,wood); B(980,560,170,20,wood); C(940,526,24); E(1005,536); C(1100,645,25,1) |
| 5 / 보스의 폐공장 벙커 / factory-night / 5 | B(690,646,44,48,tnt); B(745,646,44,48,tnt); B(800,646,44,48,tnt); B(850,620,28,100,stone); B(1030,620,28,100,stone); B(940,558,220,24,stone); C(900,522,24,2); C(980,522,24,2); C(1100,646,24) |
| 6 / 둥지 탈환 대축제 / meadow-gold / 5 | F(430,425,120,410,0,-0.0012); G(540,430,44,-0.025); T(590,630,40); S(660,400,26,150,310,490,2.4); H(810,290,110,40,810,175); B(775,646,44,48,tnt); B(825,646,44,48,tnt); B(850,620,30,100,stone); B(1080,620,30,100,stone); B(965,558,270,24,stone); C(850,522,24,2); C(1080,522,24,1); B(895,503,26,86,wood); B(1035,503,26,86,wood); B(965,448,200,24,stone); B(925,398,26,76,stone); B(1005,398,26,76,wood); B(965,348,140,24,stone); C(965,298,38,0,true,120); E(1130,656) |

- 모든 E는 `kind:'egg'`. 第4장 E536+14=550으로 다리 위 bridge top550과 일치하고, 第6장 E656+14=670으로 바닥에 닿는다. 보스 radius38,120HP는 최상단 cap top336과 맞는다. 최우측 요새는 x1115 이내이므로 둥지130px 외곽 x1140..1270과 겹치지 않는다. 배치는 T08 실제 해법 검증으로 소폭 조정할 수 있으나 요구 기믹 삭제·무적 달걀·무료 아이템으로 난이도를 우회하지 않는다.
- story speaker/avatar는 순서대로 `골목대장 길고양이/🐱`, `담장 경비 고양이/😼`, `옥상 바람잡이/😺`, `시계탑 집사냥/🕰️😼`, `벙커 방패대장/🛡️😾`, `보스 고양이 킹냥이/👑🐱`다. 1장 speaker는 기존 App 테스트와 호환한다. text는 순서대로 `이 둥지는 이제 내 낮잠 자리다냥!`, `냄비 방패와 타이어를 넘어와 보라냥!`, `셔터와 상승 바람을 읽을 수 있겠냥?`, `아기 달걀까지 지킬 수 있겠냥?`, `두 겹 방패와 TNT 벙커다냥!`, `세 겹 요새를 지키는 내가 마지막 상대다냥!`. chickReply는 각각 `둥지를 돌려줘 삐약!`, `튕겨서 뒤쪽을 노릴 거야!`, `질풍 부스터로 바람을 타겠어!`, `달걀을 지키며 쇠사슬을 끊겠어!`, `메테오 급강하로 빈틈을 열겠어!`, `황금 깃털로 우리 둥지를 되찾겠어!`를 쓴다.

### I03. 진행·스킬·정산을 데이터에 연결
- Related Files:
  - `apps/web/src/game/engine.ts` :: `releaseAim`, `activateSkill`, `handleCollisions`, `step`, `continueAfterEvolution`, `createSnapshot` — 단계 상수 제거; modify
  - `apps/web/src/game/use-chick-cannon.ts` :: 초기 snapshot — 타입 호환; modify
  - `apps/web/src/components/GameHud.tsx` :: ammoSlots — 단계별 탄환 수; modify
  - `apps/web/src/game/engine.test.ts`, `apps/web/src/game/asset-cache.test.ts`, `apps/web/src/game/renderer.test.ts`, `apps/web/src/components/GameModal.test.tsx` — 변경된 기본값/매핑; modify

#### Details
- `releaseAim`과 renderer aim guide는 `form.launchPower`를 사용하고 impact 배율도 `CHICK_FORMS[this.stage].damageMultiplier`를 사용한다. 기존 stage===2/3/4의 의미가 깨지지 않도록 `activateSkill`을 skillKind로 switch한다.
- shell: 기존 radius8 껍질3개 및 velocity 유지, projectile:'shell', 수명3000ms. boost/meteor: 기존 velocity 변경을 그대로 유지. feathers: 기준 방향 angle=atan2(chick.vy,chick.vx), [-0.45,-0.30,-0.15,0,0.15,0.30,0.45]rad의 7개, radius6,density0.004,restitution0.1,labelchick,projectile:'feather',속도32,수명2000ms. 스폰은 원래 chick 중심에서 진행방향×(원래radius+10)만큼 떨어뜨려 자기 본체와 겹치지 않게 한다. 원래 activeChick는 바꾸지 않으며 skillUsed는 샷당 한 번. 보조 투사체와 부모 chick의 충돌을 필터링해 자기 충돌로 가속하지 않는다.
- 보조 투사체 수명은 이 Task에서는 engine.timing.timestamp로 계산하고 T04가 simulationTimeMs에 통합한다. 만료 시 Composite와 추적 map 둘 다 제거한다. per-stage reset에서 정리한다.
- `continueAfterEvolution`의 상한, `WON` 후 엔딩 분기, evolvedForm lookup은 LAST_STAGE/STAGE_ORDER에서 읽는다. 1~5 클리어는 EVOLUTION(다음 레벨),6 클리어만 ENDING/campaignComplete true. evolvedForm은 다음 레벨 형태이며 같은 formId라도 next-stage 정보로 제공한다(T07가 문구를 구분).
- `GameHud`의 ammoSlots는 `STAGES[snapshot.stage].ammo`로 바꾼다. 기존 단계1,2=3/나머지4 조건을 제거한다. 스냅샷 초기값은 단계1 데이터를 사용한다.
- 테스트: 같은 baby 1/2 shell, breeze3/4boost, fighter5meteor, golden6 sevenfeathers+1 activeChick; 제한·수명·피해배율·최종단계 조건. 진행 테스트는 테스트 harness로 적 제거 후 실제 정산 step을 돌리고 각 단계에서 `continueAfterEvolution`을 호출해 1→6을 검증한다. 정상 게임 API에 nextStage/skipLevel을 추가하지 않는다. 레벨별 `dismissDialogue` 후 120frames 무입력으로 실제 물리를 진행했을 때 인질이 살아 있고 자동 TNT폭발·낙하 샹들리에가 없어야 한다. T04의 대화 중 물리 동결 뒤에도 이 안정성 테스트가 무의미해지지 않게 한다.

## Acceptance Criteria
- [ ] 모든 여섯 레벨에 지정 테마·기믹·스토리가 있고 초기 상태가 안정적이다.
- [ ] 같은 형태의 두 레벨이 같은 스킬·파워를 쓰며 6장에서만 최종 엔딩이 열린다.
- [ ] 5·6장 자원 로딩이 존재하지 않는 SVG를 요청하지 않는다.
- [ ] 보조 투사체가 만료·재시도·전환 후 누적되지 않는다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/stages.test.ts src/game/engine.test.ts src/game/engine-gimmicks.test.ts src/game/asset-cache.test.ts src/game/renderer.test.ts src/components/GameModal.test.tsx`
- `npm.cmd run build --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(game): expand the campaign to six levels

Plan: 2026-10-21-chicks-cannon-six-levels-and-feedback
Phase: P01-campaign-and-game-feel
Task: T02-six-level-campaign

- Define six themed fortresses and data-driven chick forms
- Align skills, ammunition, asset mapping and final-stage completion
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
