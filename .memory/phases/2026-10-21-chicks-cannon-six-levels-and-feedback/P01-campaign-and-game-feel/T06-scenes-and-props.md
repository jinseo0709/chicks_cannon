# Task: T06 여섯 테마 배경과 구체적인 장애물 그래픽

## Status: pending

## Goal
여섯 레벨을 장소·시간대가 다른 정적인 카툰 장면으로 구분하고, 실제 T01장애물의 외형과 접지/지지 표현을 물리에 맞춘다.

## Decision Summary
- 건물·구름·난간은 고정,축제입자는6장만움직인다. 환풍구바람·톱니회전·샹들리에움직임은물리/프레젠테이션시간에따르는개별오브젝트다.
- 원경/중경/근경은색·크기·명암으로깊이를표현하고수평parallax를다시넣지않는다. 블록은이전시각두께공식을유지하며충돌크기는바꾸지않는다.

## Implementation

### I01. 테마 디스패치와 배경
- Related Files:
  - `apps/web/src/game/renderer.ts` :: `drawBackground`, 기존Chapter함수들, `drawGround`, `drawFestivalParticles` — finalthemes; modify
  - `apps/web/src/game/stages.ts` :: theme데이터 — read-only
  - `apps/web/src/game/renderer.test.ts` :: 여섯테마/정지비교 — modify

#### Details
- **Signatures & Types**:
  ```ts
  private drawBackground(stage: GameStage, sceneTime: number): void;
  private drawAlleyBackground(afternoon: boolean): void;
  private drawRooftopBackground(): void;
  private drawClockTowerBackground(): void;
  private drawFactoryBackground(): void;
  private drawMeadowBackground(sceneTime: number): void;
  private drawGround(stage: GameStage): void;
  ```
- STAGES[stage].theme으로dispatch하고T02임시매핑을없앤다. 기존ChapterOne=alley,Two=rooftop,Three=factory,Four=meadow그림을재사용/이름정리한다. clock은별도이며afternoon은다른palette·태양위치·담장세부를쓴다.

| theme | sky gradient top→bottom | Landmark / near-ground |
| :--- | :--- | :--- |
| alley-day | #a0d8ef→#e0f4ff | 둥근구름,붉은벽돌#d36a55,전신주/전깃줄,청보라아스팔트#52638e |
| wall-afternoon | #ffd08c→#ffe7c2 | 낮아진태양(x1010,y230,r60),살구구름,주황벽돌#e17f55,담장깃발,바닥#bd865d |
| rooftop-sunset | #ff7e5f→#feb47b→#ffeccc | 창문빛도심·빨랫줄·물탱크·코랄난간,민트우레탄#47a9a2 |
| clock-twilight | #6853a4→#ba8bca→#ffd3b0 | 원경첨탑·중앙큰시계탑x1060,y160~600,시계바늘고정,황동볼트/보라바닥#76558c |
| factory-night | #2b1055→#40548a→#7597de | glow보름달x1025,y150,r65·공장굴뚝·배관·정적톱니실루엣,네이비철판#33496f+청록edge |
| meadow-gold | #f6d365→#fda085 | 금빛햇살glow·민트언덕·무지개·우측둥지·14개꽃가루/깃털,풀밭#6cb879 |

- 원경은하늘색을섞은실루엣,중경은작은불켜진창/난간/시설,근경은볼트·하이라이트. 태양/달의radialglow는save/restore안에둬후속entity의shadowBlur를오염시키지않는다. 공장도회색단색이아니고보라/청록edge와따뜻한창을쓴다. 굴뚝연기는이번결정상정지실루엣이다.
- drawGround는현재682시작과실제충돌top670불일치를고쳐y670에서시작한다. 경계한줄밝은edge,아래AO/재질디테일. staticground를시각으로옮길뿐물리좌표는유지한다. nest는WORLD.nest를{x1205,y630}으로맞춰130×80바닥이670에닿게한다. 새둥지는요새최우측1115와간격25이상,우측1270안에들어간다. renderer.test의drawImage기대는(1140,590,130,80)로갱신한다. slingshot은기존굵은원목/가죽pouch와바닥base유지하며실루엣/발사bird를가리지않는다.
- 1~5장background메서드에는시간에의한좌표변경이없다. 6장14개입자만기존결정성함수를사용하고sceneTime은T04presentation이다. 정적gear실루엣과실제entitygear의회전을혼동하지않는다.

### I02. 물리와 맞는 장애물 그리기
- Related Files:
  - `apps/web/src/game/renderer.ts` :: `drawEntity`, `drawFan`, `drawGear`, 신규`drawTire/drawChandelier/drawGearEntity`, `drawShutterSupport` — finalprops; modify
  - `apps/web/src/game/renderer.test.ts` :: pose와지원연결; modify

#### Details
- **Signatures & Types**:
  ```ts
  private drawTire(entity: GameEntityView): void;
  private drawGearEntity(entity: GameEntityView): void;
  private drawChandelier(entity: GameEntityView): void;
  private drawFan(entity: GameEntityView, nowMs: number): void;
  private drawShutterSupport(entity: GameEntityView): void;
  ```
- tire: entityradius를외곽으로그려물리와일치;darknavy#27324a/고무#41475a의radialgradient,두꺼운ring+안쪽구멍(실제물리는solidcircle임을test/report에명시),외곽20개트레드다각형,안쪽작은금속축#78c1d1. 타이어전체에worldangletransform,고정접지ellipse(x,y+r+4,rx*.8,ry7)를먼저그린다. 원형구멍처럼보여도공략은표면반사임이분명하게앞축을채운다.
- gearEntity: bodyangle그대로회전,12개또는큰radius에16개치아. outerradius=physicsradius,innerroot0.78radius,하이라이트·중앙hub0.25radius·4개리벳·보라/청록메탈gradient. 회전원중심은고정support볼트. 기존background `drawGear(x,y,radius,teeth)` helper는정적실루엣용이므로이름을`drawBackgroundGear`로바꿔혼동을막는다. 기계두축을인접배치할경우상반회전으로보이게할수있지만T02충돌배치는바꾸지않는다.
- chandelier: anchor는world고정,w/hbody는현재entity위치/angle. 본체그리기전world좌표에서anchor→currentcenter로쇠사슬(간격10px타원고리)을그린다. attached=true이면연속체인+천장beam;false면체인은천장짧은끊어진조각만남고떨어진본체에전체와이어를연결하지않는다. 본체는황동그릇/3개밝은전구/금속장식,외곽은physicsrectangle보다최대8px. 본체는물리angle로회전하며가짜sin위치로움직이지않는다. castshadow는chandelier현재bounds아래에도그린다.
- fan: force영역은기존x±w/2,y±h/2. 바람기둥투명채움·위로흐르는곡선/먼지≤18개,파이프본체는영역하단(y+h/2)에붙여baseheight40px,폭64px,둥근elbow/검은vent입구/4개볼트와motor날개를그린다. 파이프는force영역용센서외형이고별도불가시벽을추가하지않는다. 바람이위로향함을입자주기y감소로보여주고획전체가옆으로스크롤되지않게한다.
- shutter: y170 beam/도르래/현재상단까지wire는기존T02구성을유지한다. 셔터최고위치가beam아래인지확인하고wire길이가음수가되면0으로clamp. 본체는밝은청록/자주메탈슬랫·bolt. body이동량과그림이동량을중복더하지않는다.
- 모든그리기save/restore균형과globalAlpha/shadowBlur/lineDash복원을확인한다. drawEntity에신규kind분기가기존boulderfallback으로흘러가지않게한다. 이미T01에서physicsbody로snapshot에나오므로스폰시각위치를추정하지않는다.

### I03. 접지·재질 회귀 검증
- Related Files:
  - `apps/web/src/game/renderer.ts` :: `drawEntityShadow`, `drawBlock`, `render` — 접지/텍스처; modify
  - `apps/web/src/game/constants.ts` :: `WORLD.nest` — 지면맞춤; modify
  - `apps/web/src/game/renderer.test.ts` — gradient/static/dynamic검증; modify

#### Details
- 기존목재grain/knot/연베이지상단edge/짙은하단AO,메탈rivets/광택,시각크기baseWidth+min(8,baseWidth*.12),baseHeight+min(6,baseHeight*.08)을유지한다. stone물리는그대로금속철골색#469bb8/#164e68,night에서진한네이비+밝은보라/청록edge다. 블록회전시highlight도함께회전한다.
- shadow색은rgba(0,0,0,0.25),기존cat/block/chick/egg/boulder에chandelier/tire를추가한다. 본체보다먼저ellipse,살아있는/보이는대상만. 고양이ghost는T05자체effect이므로중복접지shadow없음. slickground패치는해당ground바로위에유지한다.
- Canvas mock은사용할gradient/ellipse/bezier/clip/arc등을추가하되중요하지않은정확한호출순서전체스냅샷에매달리지않는다. 1~5장의entity없는PAUSED snapshot을time200/6200에그려배경좌표불변,6장의입자만변함을검증한다. 여섯theme첫gradient색/landmark,gearangle,currentchandelierchain(분리전후),ventparticleage,nestbounds,visualvsphysicsblockbounds를확인한다. T08에서실제화면품질을검증한다.

## Acceptance Criteria
- [ ] 여섯 시간대·장소가 색과 랜드마크로 구분되며 배경은 고정이다.
- [ ] 환풍구/타이어/톱니/샹들리에가 구체적인 사물이고 그림이 실제 물리 상태를 따른다.
- [ ] 모든 주요 본체의 접지 그림자·블록 재질·새총 두께가 유지된다.
- [ ] 둥지와 블록의 시각 접지면이 실제 ground top670과 맞는다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/renderer.test.ts src/game/character-renderer.test.ts src/game/impact-renderer.test.ts`
- `npm.cmd run build --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(graphics): render six themed scenes and detailed obstacles

Plan: 2026-10-21-chicks-cannon-six-levels-and-feedback
Phase: P01-campaign-and-game-feel
Task: T06-scenes-and-props

- Distinguish six static locations and times of day
- Match detailed props, support wires and shadows to physics state
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
