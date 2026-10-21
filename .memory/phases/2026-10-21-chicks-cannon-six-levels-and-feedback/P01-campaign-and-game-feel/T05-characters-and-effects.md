# Task: T05 귀여운 Canvas 캐릭터와 타격·퇴장 이펙트

## Status: pending

## Goal
실제로 사용되는 캐릭터 경로를 귀여운 Canvas 벡터로 바꾸고, T04의 타격 이벤트로 별·먼지·떠오르는 텍스트와 X눈 고양이 퇴장을 그린다. SVG가 로드되었을 때도 새 그림이 보여야 한다.

## Decision Summary
- 병아리/고양이는 새 drawBird/drawCat을 기본 경로로 사용한다. nest/slingshot/egg SVG는 유지한다. 기존 SVG파일 자체를 불필요하게 삭제하지 않는다.
- 파티클은 event.id를 seed로 결정하고 age를presentationTime에서 계산한다. render가 같은snapshot을몇번그려도이펙트가중복생성되지않는다.

## Implementation

### I01. 캐릭터 그리기 모듈
- Related Files:
  - `apps/web/src/game/character-renderer.ts` :: `drawBird`, `drawCat`, pose 타입 — 캐릭터 벡터; new
  - `apps/web/src/game/renderer.ts` :: `drawLoadedChick`, `drawEntity`, `drawSprite` — 기본 경로 전환; modify
  - `apps/web/src/game/character-renderer.test.ts` :: 상태별 그림; new
  - `apps/web/src/game/renderer.test.ts` :: 실제 dispatch; modify

#### Details
- **Signatures & Types**:
  ```ts
  export type BirdPose = 'loaded' | 'flying' | 'resting';
  export type CatPose = 'idle' | 'hit' | 'defeated';
  export function drawBird(ctx: CanvasRenderingContext2D, entity: GameEntityView, form: ChickForm, pose: BirdPose, nowMs: number): void;
  export function drawCat(ctx: CanvasRenderingContext2D, entity: GameEntityView, pose: CatPose, nowMs: number): void;
  ```
- 입력entity좌표는world좌표,함수내save→translate(x,y)→rotate(angle)→draw→restore로감싼다. radius없으면bird=form.radius/cat24. normalbody외곽은radius×1.15안에,부속날개/귀는1.4안에서표현해물리와시각차이를제한한다. 기존sprite의2.8배drawImage가여전히겹쳐그려지지않게한다.
- bird: radialgradient중심(-0.3r,-0.4r),몸체ellipse rx1.05r,ry0.95r; baby색#fff7a7→#ffc841→#eb912a,breeze#fff8cf→#f0d484,fighter#fff3c0→#e9ad43,golden#fff8bc→#ffd04d→#db8a20. 진한외곽#81502d,두께max(2,r*.07),복부연한ellipse,좌우눈검정ellipse각각반사광큰원r*.11/작은원r*.045 두개. cheek는#ff9a64반투명ellipse,부리는작은#f78a32삼각형. loaded는양볼scale1.2+몸통미세호흡sin(now/260)*.025; flying은sin(now/65)*.6로좌우날개회전(4~6프레임느낌),resting은고정. 형태별벼슬/날개/황금왕관을구분한다.
- shell projectile은작은균열껍질타원,feather는황금곡선깃털로별도분기하여큰눈달린닭을7개그리지않는다. `entity.projectile`를먼저확인한다. 일반flyingpose는active projectilekindchick이고snapshotstateFLYING/RESOLVING일때,loaded는drawLoadedChick에만쓴다. 조준탄환은기존WORLD.cannon/aimPosition위치에서계속보인다.
- cat:몸통은flattenedellipse rx1.1r,ry0.85r,radialgradient#8494b8→#3f547b,귀triangles핑크#ffb7bb,턱ellipse#fff6df,작은분홍코와W자입,수염좌우3개. idle은반달눈곡선과작은빛점,hit은감은눈짧은꺾임/눈썹,defeated는X두쌍. boss는금관·둥근큰볼,shield는별도냄비뚜껑을왼쪽에그리며layers2는안쪽밝은링추가/layers1한링/layers0깨진손잡이만. shield:boolean과현재layers를혼동하지않는다.
- renderer는cat hitUntilMs>now이면hit,나머지idle. 기존drawSprite의cat/chick SVG분기를삭제또는egg전용으로축소한다. egg는기존SVG+fallbackgradient반사광유지. loaded에도반투명접촉ellipse를그리되물리체를추가하지않는다.
- 캐릭터테스트는윤곽path전체스냅샷을복제하지않고pose별눈/날개변환과save/restore균형,형태별색,projectile별분기,로드된SVGmock에도새캐릭터함수가호출됨을검사한다. 실제완성도판정은T08스크린샷에서한다.

### I02. 별·먼지·텍스트·고양이 퇴장
- Related Files:
  - `apps/web/src/game/impact-renderer.ts` :: `drawImpacts` — 순수 이펙트; new
  - `apps/web/src/game/impact-renderer.test.ts` :: 수명/결정성/과부하; new
  - `apps/web/src/game/renderer.ts` :: `render` — world 위 이펙트 합성; modify

#### Details
- **Signatures & Types**:
  ```ts
  export function drawImpacts(ctx: CanvasRenderingContext2D, impacts: readonly ImpactEvent[], nowMs: number): void;
  ```
- 사건kind cat-hit/cat-defeat/strong-impact/explosion은contact.point에서노랑#ffe875/주황#ff9f32의5각별8개(수명280ms,반경4..7px)와둥근먼지6개(450ms,반경6..14px)를펼친다. shield-hit는별4개+작은금속링으로구분,butter는노랑방울6개만그린다. 속도방향은event.id,index로정한seed와균등분산각,base120~220worldpx/sec;gravity400px/sec². render안Math.random금지. alpha=1-age/lifetime,크기감쇠. 같은time/이벤트는완전히같은좌표다.
- 떠오르는글자는catdefeat이면`+{scoreDelta}`,나머지는intensity<12 POW!,12~24 BAM!,>=24 CRASH!,shield는CLANG!. 650ms수명,y=-age*.065,초반80msscale1.3→1,이후1,alpha마지막250msfade. 폰트Jua,bold28px(처치32),stroke#724b3a4px,fill#fff1a0,카툰drop-shadow. Canvas font가아직로드되지않으면sans-seriffallback. body/UI가아닌world이펙트레이어다.
- cat-defeat은event.cat중심/angle/radius에서ghost고양이를그린다. age0..650ms동안x+=direction.x*age*.16,y-=age*.2-0.00045*age²,angle+=sign(direction.x||1)*age*.01,마지막200msfade. `drawCat(...,'defeated')`를재사용한다. ghost는Matter본체/HP/점수가없으며고양이살아있음정산에포함하지않는다. appearance복사로boss/shield형태도유지한다.
- newest이벤트부터전체파티클최대128,텍스트최대12,ghost최대8로drawbudget을제한한다. lifetime지난것은그리지않는다. eventbuffers1500ms이후엔정리되므로render자체에무한배열을쌓지않는다.
- renderer합성순서:background/ground→entityshadows→props→aim/loadedbird→aliveentities→drawImpacts. 모두T04worldshaketransform안이다. pause시간동결로입자도정지하고loadStage의sceneId변경으로옛이벤트가사라진다. dispose이후그리지않는현재guard를유지한다.
- 테스트는age0/200/700/1600,같은id/time반복동일path,다른idseed차이,사망ghost의XXpose와투명도,dust/starcap,deadline후draw없음을검증한다.

### I03. 실제 사용 자원과 fixture 정리
- Related Files:
  - `apps/web/src/game/asset-cache.ts` :: `stageAssetIds` — 불필요한프리로드제외; modify
  - `apps/web/src/game/asset-cache.test.ts` :: 필수prop로딩; modify
  - `apps/web/src/game/renderer.test.ts` :: loadedchick SVG기대값교체; modify

#### Details
- stageAssetIds는이제캐릭터/배경SVG를기다리지않고 `['nest','slingshot','egg']`만preload한다. 기존AssetId/assetPaths와퍼블릭SVG파일은수동assetcache테스트등의호환을위해유지한다. stage매개변수는선택프로프확장가능API로유지하되`_stage`로명명해미사용의미를드러낼수있다.
- loadedchick테스트는drawImage(image,...)기대대신AIMING/ammo>0의캐릭터호출/좌표,ammo0/terminal에로드탄환없음을검증한다. nest SVGdrawImage위치검증은보존한다. eggfallback/외부로드실패도새캐릭터출력을막지않아야한다.

## Acceptance Criteria
- [ ] 실제 기본 캐릭터가 눈하이라이트2개·볼터치·입체몸통·귀/턱/수염을 가진다.
- [ ] 조준볼/비행날개/피격눈/처치X눈 상태가 구분된다.
- [ ] 타격별·먼지·텍스트·퇴장이 정확한 위치와 수명으로 보이고 pause/재시도에 누적되지 않는다.
- [ ] 기존 SVG가 성공해도 새 캐릭터를 가리지 않고 입자수상한을지킨다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/character-renderer.test.ts src/game/impact-renderer.test.ts src/game/renderer.test.ts src/game/asset-cache.test.ts`
- `npm.cmd run build --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(graphics): animate cartoon characters and hit effects

Plan: 2026-10-21-chicks-cannon-six-levels-and-feedback
Phase: P01-campaign-and-game-feel
Task: T05-characters-and-effects

- Draw expressive chick and cat poses directly on Canvas
- Add deterministic sparks, dust, floating text and defeat exits
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
