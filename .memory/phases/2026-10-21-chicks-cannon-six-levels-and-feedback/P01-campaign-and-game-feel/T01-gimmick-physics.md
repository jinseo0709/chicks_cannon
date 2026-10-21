# Task: T01 실제 장애물 물리·방패 계층·연쇄 TNT

## Status: done

## Goal
새 원형 타이어·회전 톱니·분리 가능한 샹들리에가 Matter.js에서 실제로 작동하고, 방패/연쇄 폭발의 피해·처치를 한 경로에서 계산한다. 이 Task에서는 현재 4단계 배치를 유지하며 새 장애물은 물리 테스트에서 스폰한다. 다음 T02가 최종 6단계에 배치한다.

## Decision Summary
- Matter.js 0.19.0을 유지한다. 타이어는 입사 속도의 1.8배 반사, 톱니는 고정 원형 충돌체의 회전 접선 밀침, 샹들리에는 실제 Constraint 제거 후 낙하다.
- 스코어 중복과 체인 재귀를 막기 위해 폭발·충돌이 공유하는 피해/처치 함수를 만든다. 기존 재시도 점수·아이템 정책은 바꾸지 않는다.

## Implementation

### I01. 모델과 스폰·수명
- Related Files:
  - `apps/web/src/game/types.ts` :: `GimmickKind`, `SpawnSpec`, `GameEntityView` — 장애물 및 방패 상태; modify
  - `apps/web/src/game/engine.ts` :: `GameBody`, `spawn`, `loadStage`, `dispose`, `createSnapshot` — 본체/연결 관리; modify

#### Details
- **Signatures & Types**:
  ```ts
  // 기존 kind는 유지하고 다음 세 kind를 추가한다.
  type NewGimmickKind = 'tire' | 'gear' | 'chandelier';
  interface AddedSpawnFields {
    hp?: number;
    shieldLayers?: number;
    anchor?: Point;
    angularSpeed?: number;
    breakImpact?: number;
  }
  interface AddedEntityFields {
    shieldLayers?: number;
    anchor?: Point;
    attached?: boolean;
    angularSpeed?: number;
  }
  ```
- **Data & Schema Fields**: `SpawnSpec.kind`와 `GimmickKind`에 3종 추가. 기존 `shield?:boolean` 호환은 유지한다. cat의 `shieldLayers` 기본값은 `spec.shieldLayers ?? (spec.shield ? 1 : 0)`, 정수 0~2로 clamp; `shield`는 남은 겹수와 별개로 원래 방패병 여부/점수 기준으로 보존. `hp` 기본값은 기존 boss60/shield28/normal18, `spec.hp`가 양수이면 덮어쓴다.
- `GameBody.customData`에 `anchor?:Point`, `attached?:boolean`, `angularSpeed?:number`, `breakImpact?:number`, `shieldLayers?:number`를 넣고 snapshot으로 복사한다. `private chandelierConstraints = new Map<number, Matter.Constraint>()`를 두고 Matter `Constraint`를 import한다. 살아있는 본체 제거 시 연결도 제거하며 `loadStage`/`dispose`에서 map을 비운다.
- tire: `Bodies.circle(x,y,radius??40,{isStatic:true,restitution:0,friction:0.8,label:'tire'})`. gear: radius 기본44, static 원형, restitution0.15, friction0.3, label gear; `angularSpeed` 기본0.025rad/기준16.667ms. chandelier: rectangle 기본100×36, density0.012, friction0.5, restitution0.1, label chandelier. 기본 anchor `{x:spec.x,y:spec.y-140}`, Constraint pointA=anchor/bodyB=body/pointB={0,0}/length=거리/stiffness0.95/damping0.04. 기본 `breakImpact=18`. 초기 `Body.setVelocity(body,{x:0.6,y:0})`와 `Body.setAngularVelocity(body,0.008)`로 작게 흔들리기 시작하게 하며 외부 모터로 매번 위치를 덮어쓰지 않는다. 각속도만 주면 중심 연결에서는 진자 운동이 시작되지 않으므로 수평 초기 속도를 함께 준다.
- `createSnapshot`의 label whitelist와 kind mapping에 신규 세 label을 명시 추가한다. 누락되어 보이지 않는 본체가 생기지 않게 한다. 기존 trampoline/boulder/fan/shutter는 유지한다. 숫자·anchor가 NaN/무한대인 입력은 테스트 fixture에서도 사용하지 않으며 스폰에서 양수 크기 기본값으로 방어한다.

### I02. 반사·회전·충격 분리
- Related Files:
  - `apps/web/src/game/engine.ts` :: `step`, `advanceGimmicks`, `handleCollisions` — 실제 장애물 반응; modify
  - `apps/web/src/game/engine-gimmicks.test.ts` :: 신규 동작 테스트; new

#### Details
- `advanceGimmicks(deltaMs:number):void`로 바꾸고 shutter 이동도 `deltaMs/16.667` 배율로 계산한다. gear는 위치를 고정한 채 `Body.setAngle(body,body.angle+angularSpeed*deltaMs/16.667)`로 회전한다. 시각 회전과 충돌 접선 효과에 같은 회전 방향을 쓴다.
- Matter Engine은 `collisionStart` 후 velocity solver를 실행한다. tire 충돌에서 solver 전 반사 속도를 기억한 뒤 해당 `Engine.update` 종료 직후 `Body.setVelocity`를 한 번 적용한다. 정상 벡터는 tire 중심→동적 body 중심을 정규화한다. 입사 `dot(v,n)<0`일 때 `vOut=1.8*(v-2*dot(v,n)*n)`, 총 속도 상한55. 반사 대상은 비정적 본체이고 중복 pair 처리는 body-id별 한 번만 한다. tire 자체 restitution은 0으로 두어 수동 반사와 중복하지 않는다. 기존 bouncePad는 기존 동작을 유지하되 tire pair를 그 분기로 보내지 않는다.
- gear 접촉은 `collisionStart`와 `collisionActive`에서 처리하고 body별 100ms simulation-time cooldown을 둔다(이 Task의 Matter timing.timestamp 기준, T04에서 simulationTimeMs로 통합). 접선 `(-ny,nx)*sign(angularSpeed)`, velocity에 접선×2.5를 더하고 총속도45로 제한. `collisionActive` 리스너는 constructor 등록/dispose 해제한다. 정적 본체를 가속하지 않는다.
- chandelier와 다른 body의 상대속도×3.5가 breakImpact 이상이면 Constraint를 제거하고 `attached=false`; 한 번만 끊어진다. 바닥 접촉·초기 스윙의 약한 접촉은 단절시키지 않는다. 분리 후 낙하·충돌은 일반 중량물처럼 처리한다.

### I03. 피해·방패·폭발 경로 통합
- Related Files:
  - `apps/web/src/game/engine.ts` :: `handleCollisions`, `explode`, 신규 피해 헬퍼 — 중복 없는 피해; modify
  - `apps/web/src/game/engine-gimmicks.test.ts` :: 방패/체인/인질; new

#### Details
- **Signatures & Types**:
  ```ts
  type DamageSource = 'chick' | 'block' | 'chandelier' | 'explosion' | 'fall' | 'other';
  interface DamageContext { source: DamageSource; point: Point; direction: Point; frontal: boolean; }
  private damageBody(body: GameBody, amount: number, context: DamageContext): void;
  private defeatCat(body: GameBody, context: DamageContext): void;
  private breakBlock(body: GameBody, context: DamageContext): void;
  private explode(x: number, y: number, radius: number, forceMagnitude: number): void;
  ```
- `DamageContext`는 engine 내부 타입이며 T04 이벤트의 근거가 된다. direction은 충돌 상대→피격 본체 방향 단위 벡터(동일 중심이면 `{x:1,y:0}`); point는 pair.collision.supports의 유효 첫 접점, 없으면 두 본체 중심의 중간점이다. source chick는 껍질/깃털도 포함한다. 정적 타일 접촉을 공격자로 잘못 표시하지 않는다.
- 기존 impact=relativeSpeed×3.5×단계배율을 유지한다(T02에서 배율은 form 데이터로 바꿈). block 최소impact>5, cat>4.5, egg>3.2를 유지. `frontal`은 기존 front 조건(other.x < cat.x-5이고 위에서 오는 유효 하강샷이 아님)이다. 살아있는 방패 cat에 frontal chick hit면 shieldLayers를 한 겹 줄이고 해당 chick를 x=-abs(vx)*0.7,y=-4로 반사; 그 hit의 HP 피해는0. 측후방/낙하물/폭발은 방패를 우회한다. layers0은 다음 정상 피해를 받는다. 차감한 겹수는 정확히 snapshot에 반영한다.
- defeatCat은 alive=false를 먼저 기록한 뒤 body와 constraint를 제거하고 최초 한 번만 점수 boss3000/shield2000/normal1200. 사라진 본체를 body map에 계속 남기지 않는다. alive=false인 collision pair를 다시 처리하지 않는다.
- 폭발은 FIFO queue로 처리한다. TNT는 destroyed=true/alive=false 및 제거를 먼저 한 뒤 `(x,y,230,0.14)`를 queue에 추가, 각 TNT의 폭발점수600은 한 번. 보통 블록 점수180, 기존 폭발의 거리별 피해50×(1-distance/radius)와 힘은 유지. queue processing boolean으로 재진입을 막고 TNT 연쇄를 누락하지 않는다. explosion의 egg 피해도 damageBody를 거쳐 hp<=0이면 즉시 `LOST/hostage`; 현재 누락된 폭발 인질 판정은 신규 레벨의 보호 기믹에 필요한 수정이다. 호스트 사망 시 승리 판정보다 패배 우선.
- `step`에서 살아있는 cat이 y>WORLD.height+60 또는 x>WORLD.width+150이면 fall source로 한 번 처치한다. 액티브 chick 정산 기준은 유지한다.
- 테스트에서만 private engine/spawn/body map을 typed cast한 harness를 사용해 fixture를 주입한다. production에 cheat API를 추가하지 않는다. `Events.trigger`만으로 끝내지 않고 반사/스윙/낙하는 실제 `Engine.update` 단계도 돌려 위치·속도·Constraint 수를 검증한다. 기존 quake를 DIALOGUE에서 호출해도 현재 구현은 소모하므로 이 Task에서는 기존 테스트 정책을 임의로 바꾸지 않는다(T03가 상태 gate를 명시 정리).

## Acceptance Criteria
- [x] 수직/대각 입사 타이어 속도가 중복 가속 없이 1.8배 반사되고 상한을 지킨다.
- [x] 톱니에 실제 접촉한 동적 물체만 회전 방향으로 밀리고 pause 시 멈춘다.
- [x] 샹들리에 Constraint가 충격에 한 번만 끊어져 낙하하며 재시도에 복구된다.
- [x] 2겹 방패·TNT 체인·폭발 인질 패배·중복 처치 방지가 동작한다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/engine.test.ts src/game/engine-gimmicks.test.ts`
- `npm.cmd run build --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(game): implement interactive obstacle physics

Plan: 2026-10-21-chicks-cannon-six-levels-and-feedback
Phase: P01-campaign-and-game-feel
Task: T01-gimmick-physics

- Add tire reflection, rotating gears and breakable chandeliers
- Centralize layered shields, damage and TNT chain reactions
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 지정 테스트 16개, 웹 프로덕션 빌드, diff check 통과
- commit: 지정 Commit Message로 Git 이력에 기록
