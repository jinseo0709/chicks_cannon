# Task: T03 상·하단 HUD 분리와 버터 스프레이

## Status: failed

## Goal
상단 정보/탄환/제어와 하단 4종 도크를 분리하고, 버터 선택→Canvas 대상 지정→마찰0·약한 밀침→수량 소모/취소를 실제 사용 흐름으로 완성한다.

## Decision Summary
- T02까지 ItemKind는 booster/quake/mega다. butter 타입·모든 초기값·입력·버튼을 이 Task에서 함께 확장한다. 버터는 각 캠페인 1회, 레벨/재시도 사이 소모량 유지다.
- 물리 바닥 top670, 폭2560 범위[-640,1920]이다. 지면의 지정180px 구간만 미끄럽게 만들고 바닥 높이·충돌 면을 바꾸지 않는다.

## Implementation

### I01. 버터 모델과 물리 API
- Related Files:
  - `apps/web/src/game/types.ts` :: `ItemKind`, `GameSnapshot`, `GameEntityView`, 신규 `SlickZone` — 네번째 아이템; modify
  - `apps/web/src/game/engine.ts` :: `initialItems`, `useItem`, `loadStage`, `pause`, 신규 API — 선택과 적용; modify

#### Details
- **Signatures & Types**:
  ```ts
  type ItemKind = 'booster' | 'quake' | 'mega' | 'butter';
  interface SlickZone { id: number; x: number; width: number; }
  // GameSnapshot 필수 추가: targetingItem:'butter'|null, slickZones:readonly SlickZone[]
  // GameEntityView/Body.customData 선택 추가: slick?:boolean (default false)
  useItem(kind: ItemKind): boolean;
  applyTargetedItem(point: Point): boolean;
  cancelTargetedItem(): void;
  cancelAim(): void;
  ```
- `initialItems` 및 hook 초기 snapshot과 GameHud/GameModal/renderer 테스트 fixture의 모든 ItemCounts를 `{booster:1,quake:1,mega:1,butter:1}`로 갱신한다. `useItem`은 성공/선택변경 여부 bool을 반환하도록 하되 기존 void호출 호환은 그대로다.
- 모든 아이템은 AIMING/FLYING/RESOLVING 외 상태에서 거부. booster는 FLYING+activeChick, mega는 AIMING, quake는 세 상태, butter는 세 상태+재고>0. butter 버튼은 `targetingItem`을 toggle하고 성공 수량 차감은 하지 않는다. 다른 아이템 사용 시 butter 선택을 먼저 취소한다. 상태부적합/재고0은 false, snapshot/소리/효과 없이 반환한다.
- applyTargetedItem은 butter 선택 및 상태/재고/finite좌표와 월드 범위 x∈[0,1280], y∈[0,720]을 먼저 확인한 뒤 tracked alive block 중 `Matter.Query.point`로 회전된 실제 body를 hit-test한다. 여러 개면 중심에 가장 가까운 block을 선택한다. cat/chandelier/gear는 직접 대상이 아니다. block 선택은 body.friction=0,frictionStatic=0,slick=true; 아래쪽 body.position+{0,height*0.3}에 force={x:mass*0.0008,y:0}을 한 번 적용한다. 아주 큰 힘·직접HP감소는 금지한다.
- 블록이 없고 x∈[0,1280], y∈[660,720]이면 바닥 대상이다. patch centerX=clamp(point.x,90,1190), width180. 기존 ground를 제거하고 동일 y695/h50의 왼쪽[-640,center-90], patch[center-90,center+90], 오른쪽[center+90,1920] 정적 ground3개로 교체한다. 좌/우는 기존 계수, patch만 friction/frictionStatic0. 경계 높이는 완전히 같게 해 턱을 만들지 않는다. patch 위에 접지한 비정적 block/cat의 bounds.max.y∈[668,690]이고 중심x가 patch안이면 위의 약한 밀침을 한 번 준다. 인질·비행체는 직접 밀지 않는다. 새 ground들은 body label ground이며 레벨 재시도 시 제거·재생성한다. slickZones에는 해당 patch를 기록한다(현재 수량으로는 레벨당 최대1개).
- 유효 적용만 butter재고-1,targetingItem=null,aimPosition=null 후 publish true. 빈곳은 false/재고유지/선택유지. 같은 버튼/Escape는 취소만 한다. pause/retry/start/loadStage/terminal전환에서 선택과 드래그를 취소하며 레벨 재생성 시 slick 상태·ground patch를 비운다. 사용 아이템 수량은 retry에서 복구하지 않는다. `cancelAim`은 aimPosition만 null로 하고 발사하지 않는다.

### I02. 포인터·오디오 호출·접근성 연결
- Related Files:
  - `apps/web/src/game/pointer-input.ts` :: `GameInputHandlers`, `setMode`, pointer/keyboard listeners — target우선 입력; modify
  - `apps/web/src/game/use-chick-cannon.ts` :: `ChickCannonController`, `attachCanvas`, `useItem`, initialSnapshot — 엔진과 연결; modify
  - `apps/web/src/components/GameCanvas.tsx` :: canvas 안내 및 target status — 접근성; modify
  - `apps/web/src/game/pointer-input.test.ts`, `apps/web/src/game/engine.test.ts`, `apps/web/src/game/engine-butter.test.ts` — 입력/상태/마찰; modify|new

#### Details
- **Signatures & Types**:
  ```ts
  interface AddedInputHandlers {
    onTarget(point: Point): void;
    onTargetCancel(): void;
    onAimCancel(): void;
  }
  setMode(state: GameState, targetingItem?: 'butter' | null): void;
  ```
- pointerdown에서 PAUSED/terminal guard→targetingItem이면 onTarget(worldPoint),return→FLYING이면 기존 onSkill→AIMING이면 새총90px 드래그 순서를 따른다. item-targeting을 GameState 새 enum으로 만들지 않아 기존 pause복귀 상태를 보존한다. pointer ID 하나만 취급하고 letterbox 밖 좌표는 타깃에 전달해도 엔진에서 거부한다.
- target 선택/모드 변경 중 기존 드래그가 있으면 포인터 캡처만 해제하고 onAimCancel을 호출해 발사를 막는다. pointercancel/lostcapture도 onAimCancel로 바꿔 취소가 발사로 이어지는 기존 동작을 없앤다(관련 기존 테스트 기대값도 변경). 실제 pointerup만 onAimEnd로 발사한다. window keydown Escape는 target 선택 중 onTargetCancel; dispose 시 새 리스너까지 해제한다.
- hook는 onTarget→engine.applyTargetedItem, onTargetCancel→cancelTargetedItem,onAimCancel→cancelAim을 연결한다. rAF의 input.setMode는 current.targetingItem도 받는다. 스냅샷이 바뀐 뒤 입력모드를 즉시 맞추는 ref/동기화 경로를 마련해 버튼 클릭 직후 다음 프레임 전에 탭해도 스킬이 발동하지 않게 한다. useItem 오디오는 엔진 성공 반환값을 확인하고만 재생한다. butter는 선택 때 소모 효과음 없음, 실제 apply성공 때 playBounce를 임시 사용(T04에서 이벤트로 통합 가능).
- GameCanvas에 선택 중 `role=status`로 `미끄럽게 할 블록이나 바닥을 탭하세요. 다시 누르거나 Esc로 취소합니다.`를 표시한다. 안내는 pointer-events:none, HUD/모달을 가리지 않는 중앙 상단 여백에 놓는다. 캔버스 aria-label은 조준 안내+현재 대상 선택 안내를 반영한다.

### I03. 상단 헤더·하단 네 버튼·레이어
- Related Files:
  - `apps/web/src/components/GameHud.tsx` :: `GameHud` — 두 독립 bar; modify
  - `apps/web/src/styles.css` :: `.game-hud`, `#top-bar`, `#item-bar`, modal/media rules — 레이아웃; modify
  - `apps/web/src/components/GameHud.test.tsx`, `apps/web/src/components/GameModal.test.tsx`, `apps/web/src/game/renderer.test.ts` — UI/fixture; modify
  - `apps/web/src/game/renderer.ts` :: `render`, slick highlight — 효과 표시; modify

#### Details
- `.game-hud`는 position:absolute,inset:0,pointer-events:none,자체z-index:auto로 둔다. 직계 bar는 `#top-bar`와 `#item-bar` 두 개다. 기존 hud-topline 안 item-tray를 삭제/이동하고 `.hud-left`에 ammo를 포함하지 않는다. topbar는 chapter-card/ammo-card/hud-actions의3개 그룹, itembar는4개 button이다.
- topbar 기본 top/left/right16px,displayflex,space-between,aligncenter,z50. item-bar 기본 bottom24px,left50%,translateX(-50%),displayflex,gap12px,z50,nowrap. 버튼만 pointer-events:auto, 바 빈 공간은 none. 하단 이름과 수량은 한 줄이며 아이콘/글자가 선명한 두께감 있는 카툰 버튼이다.
- 이름은 치즈 로켓/달걀 지진/거대화/버터 스프레이(🧈), accessible label=`{이름}, 남은 {count}개`, icon aria-hidden. butter 버튼에 `aria-pressed={snapshot.targetingItem==='butter'}`와 눈에 보이는 선택 테두리. 사용 조건은 I01과 일치. 탄환 수는 STAGES[stage].ammo만큼, 각 슬롯은 form.avatar. 좌측은 `CHAPTER {n} · {STAGES[n].title}`,점수. 챕터 긴 이름은 ellipsis, accessible full text는 유지.
- HUD보다 모달이 앞에 오도록 overlay-backdrop z100,pause-backdrop110,win-toast60으로 정리한다. 현재 overlay4/pause5 아래에 두면 HUD가 모달을 뚫는 회귀가 생긴다. dialogue/paused/end/result 상태에서 dock 비활성·aria-hidden/inert 처리 또는 렌더 생략으로 모달 아래 버튼이 키보드 포커스를 받지 않게 한다.
- 기존 중복 `@media(max-width:560px)` HUD 규칙에서 `.item-tray{position:static...}` 및 topbar flex1 규칙을 제거하고 한곳에 정리한다. <=560: topbar inset8px,groupgap4px; 좌측폭 clamp(88px,30vw,130px),ammo컴팩트,row단일,우측3개 최소30×30px. itembar bottom=max(12px,env(safe-area-inset-bottom)),gap6px,button min44×44px,아이템 label숨김·badge유지,width min(100%-16px,360px). 큰 화면은 사용자 기본24px/12px을 유지한다. 320px에서도 사라지는 버튼이 없어야 한다.
- renderer는 slick block 윤곽에 반투명 노란 반사 선을, slickZones는 ground top670에 폭180 높이8의 버터빛 웅덩이와 작은 입자를 표시한다. 본체 충돌 크기는 그대로다. 블록/지면 적용 효과는 다음 T05 VFX와 중복 소모시키지 않는다.
- 테스트는 `afterEach(cleanup)`를 명시한다. DIALOGUE에서 quake가 소모되는 기존 테스트는 `dismissDialogue` 후 사용으로 수정하고, 별도로 모든 아이템의 대화중거부를 검사한다. 빈공간재고유지,회전blockpoint선택,groundpatch국소마찰,적은force,취소후무발사,FLYING타깃우선,Esc/dispose,모달중버튼차단,callback종류와재고를 검증한다. 실제 CSS box 검증은 T08에서 한다.

## Acceptance Criteria
- [ ] 두 bar가 분리되고 하단 네 버튼이 접근 가능하며 모달 위로 나오지 않는다.
- [ ] 버터 선택 탭은 스킬/발사로 전달되지 않고 성공 때만 1개 소모한다.
- [ ] 선택된 block 또는 국소180px ground의 마찰만0이 되고 재시도 시 원래 배치로 돌아온다.
- [ ] pause/retry/Escape/드래그취소에 오발사·무료환급이 없다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/components/GameHud.test.tsx src/game/pointer-input.test.ts src/game/engine.test.ts src/game/engine-butter.test.ts src/game/renderer.test.ts src/components/GameModal.test.tsx src/App.test.tsx`
- `npm.cmd run build --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(game): add targeted butter spray and split HUD bars

Plan: 2026-10-21-chicks-cannon-six-levels-and-feedback
Phase: P01-campaign-and-game-feel
Task: T03-hud-and-butter

- Separate top information from the four-item bottom dock
- Connect butter targeting, local friction patches and cancellation
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Execution Failure — 2026-10-21
- 사용자 지시대로 지정 검증 실패 시점에 T03에서 중단했다. 이후 Task와 T03 커밋은 진행하지 않았다.
- 지정 테스트 결과: 49개 중 46개 통과, 3개 실패. 실패는 `engine-butter.test.ts`의 바닥180px 패치 3개 위치(x=0/900/1280) 케이스다.
- 실패 지점: 생성된 ground 중 `friction===0`인 본체가 없어 patch가 undefined가 된다.
- 원인 확인: Matter.js 0.19.0 `Body.setStatic`은 정적 본체 생성 시 `part.friction=1`로 덮어쓴다. `Bodies.rectangle(...,{isStatic:true,friction:0})` 옵션만으로는 미끄럼 패치가 만들어지지 않는다. 블록은 동적 본체여서 직접 마찰 설정 테스트가 통과했다.
- 다음 조치: 바닥 본체를 생성한 뒤 patch의 friction/frictionStatic을 명시적으로 설정하고 지정 검증 전체를 다시 실행한다. node_modules를 수정하거나 검증을 약화하지 않는다.
- 빌드와 최종 diff check는 아직 실행하지 않았다. 현재 구현은 작업 트리에 보존되어 있고 검증 완료 상태가 아니다.
