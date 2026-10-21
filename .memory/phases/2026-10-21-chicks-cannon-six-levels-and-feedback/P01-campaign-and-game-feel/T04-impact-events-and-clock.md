# Task: T04 타격 이벤트·히트 스톱·게임 시간·야옹 오디오

## Status: pending

## Goal
물리 피해·처치를 식별 가능한 이벤트로 제공하고, 강한 순간에만 물리60ms 정지/월드150ms 흔들림을 적용한다. pause·재시도·Canvas 재연결에서 시간 점프와 사운드 중복 없이 재생한다. 별/텍스트/퇴장 그림은 후속 T05가 이 이벤트를 소비한다.

## Decision Summary
- T01의 damageBody/defeatCat/breakBlock/explode가 유일한 피해 경로다. 점수 증가량으로 충돌음을 추정하는 hook 로직을 제거하고 실제 이벤트를 읽는다.
- 프레젠테이션 시간은 히트 스톱 중에도 흐르고 simulation 시간만 멈춘다. 사용자 PAUSED에서는 두 시간이 모두 멈춘다.

## Implementation

### I01. 스냅샷 이벤트와 시간 계약
- Related Files:
  - `apps/web/src/game/types.ts` :: 신규 `ImpactEvent`, `CatAppearance`, `GameSnapshot`, `GameEntityView` — 상태 계약; modify
  - `apps/web/src/game/engine.ts` :: `step`, `loadStage`, 피해 헬퍼, `createSnapshot` — 이벤트 생산 및 시간; modify
  - `apps/web/src/game/engine-impact.test.ts` :: 이벤트와 정지 검증; new

#### Details
- **Signatures & Types**:
  ```ts
  type ImpactKind = 'cat-hit' | 'cat-defeat' | 'shield-hit' | 'explosion' | 'strong-impact' | 'butter';
  interface CatAppearance { x: number; y: number; radius: number; angle: number; boss: boolean; shield: boolean; shieldLayers: number; }
  interface ImpactEvent {
    id: number; sceneId: number; kind: ImpactKind; atMs: number;
    point: Point; direction: Point; intensity: number; scoreDelta: number;
    targetId?: number; cat?: CatAppearance;
  }
  // GameSnapshot 필수 추가:
  // sceneId:number, presentationTimeMs:number, simulationTimeMs:number,
  // hitStopRemainingMs:number, shakeUntilMs:number, impacts:readonly ImpactEvent[]
  // GameEntityView 및 customData 선택 추가: hitUntilMs?:number, hitDirection?:Point
  private emitImpact(event: Omit<ImpactEvent, 'id'|'sceneId'|'atMs'>): void;
  activateSkill(): boolean;
  ```
- 모든 새 snapshot 숫자 초기값0,impacts=[]; sceneId는 최초load부터1씩 증가. event.id는 인스턴스 전체 단조증가(재시도/새캠페인에도 초기화하지 않음). per-scene 시계는load시0,impacts/shake/stop/기믹cooldown은비운다. 객체/배열은 snapshot으로 복사하며 외부에서 엔진 상태를 수정할 수 없게 한다. 관련 literal fixture는 hook initialSnapshot,GameHud.test,GameModal.test,renderer.test와 신규 테스트에 전부 갱신한다.
- `step(deltaMs)`는 finite입력의0..33.333ms로 clamp(0은 실제 무진행); paused는 publish없이즉시return. presentation+=delta, 오래된이벤트 정리(1500ms,max64). 히트스톱이 기존에 있으면 먼저 `min(delta,remaining)`만큼 소비,남은physicsDelta만 시뮬레이션한다. Matter 업데이트는 최대16.667ms substep으로 나누고 각 substep의 simulationTime+=실제 dt, advanceGimmicks/applyFans/기존정산을 한 번씩 진행한다. T01 tire 반사후처리는 각 substep의 Engine.update 직후다.
- 활성 물리는 AIMING/FLYING/RESOLVING에만 진행한다. DIALOGUE/EVOLUTION/ENDING/LOST에서는 물리를 진행하지 않는다. WON은 프레젠테이션700ms 뒤 다음상태가 되며 물리 정지. 시각 퇴장/파티클은 DIALOGUE가 아닌 잔여 결과 상태에서도 시간수명에 따라 끝날 수 있다. PAUSED는 VFX도 정지한다.
- settleFrames는 settleMs로 바꾸고 기존 약50프레임=850ms의 저속/장외기간으로 정산한다. winFrames는 wonAtMs/700ms로 교체. 모든 만료투사체·톱니cooldown은 simulationTime 기준. 기존 Matter timing.timestamp 직접의존을 제거한다. 인질패배를 승리보다 먼저 검사하고, terminal상태를 충돌이 뒤늦게 덮어쓰지 못하게 한다.
- strong 조건은 유효 피해/충돌 intensity>=24 또는 cat-defeat. emitImpact에서 shakeUntil=max(기존,now+150),hitStopRemaining=max(기존,60); 더하지 않는다. global 다음히트스톱허용시각은now+100ms로 두어 연쇄 접촉이 시뮬레이션을 영원히 정지시키지 못하게 한다. shake는 강한경우 amplitude4px,처치6px. 약한타격/버터는 stop없음. 같은step의여러강한이벤트도stop60ms 한 번이다.

### I02. 피해/처치/방패 이벤트와 회전 리액션
- Related Files:
  - `apps/web/src/game/engine.ts` :: `damageBody`, `defeatCat`, `handleCollisions`, `explode`, `applyTargetedItem` — 이벤트 발생 지점; modify
  - `apps/web/src/game/engine-impact.test.ts` :: 처치 단발·강약·초기화; new

#### Details
- 살아있는 cat에 HP피해가 적용될 때 cat-hit,그타격으로 사망하면 cat-defeat만 한 개를 발행한다. 사망 이벤트는 hit spark도 표현한다(T05). intensity는 실제 피해량; source에 무관하게 동일함수를 통과시켜 폭발/낙하/깃털처치를 누락하지 않는다. scoreDelta는 처치점수(3000/2000/1200),hit0. shield-hit는방패겹수차감과반사후발행,score0,HP피해0이어도intensity는접촉impact다.
- cat 이벤트의 point는 접점,catAppearance는 제거직전 x/y/radius/angle/boss/shield/layers 복사본이다. CatAppearance.x/y는 body 중심이므로 접점과 구분한다. 이벤트의 targetId는 Matter body.id. dead-body를 ghost로 Composite에 남기지 않는다.
- 살아있는cat은 hitUntilMs=now+140,hitDirection=context.direction; `Body.setAngularVelocity`에 기존값+direction.x*min(0.18,damage*0.006),최종[-0.25,0.25]를 적용하고 선형속도에는 direction×min(4,damage*0.1),y에-1을추가한다. torque/velocity는 살아있는cat에만 적용하며 강한리액션이damage를재발생시키지 않는다.
- TNT/스킬explosion은explosion이벤트를1번만발행하고 FIFO연쇄각각도고유ID다. 고양이와무관한block/chandelier/shutter의collisionStart에서impact>=24이면strong-impact를발행하되 동일pair는simulation100ms cooldown. 둘 다 정적/초기미세접촉은제외. butter실제성공은butter이벤트(point,강도0,score0),선택/취소/실패는없음.
- 테스트는 동일 pair/같은 적/같은 TNT를 반복 전달해 score/event가증식하지않음을 확인한다. 실제update의고속chick/cat접촉으로 위치점유효성/회전도검증한다. 강도<24생존hit는stop0,death는강도작아도stop60,외부pause후시계불변,retryscene변경후옛이벤트제거,stop중physics위치불변과presentation증가를검증한다.

### I03. 런타임 및 오디오 이벤트 소비
- Related Files:
  - `apps/web/src/game/use-chick-cannon.ts` :: `attachCanvas` rAF/skill/item handlers — 시계/오디오; modify
  - `apps/web/src/game/audio.ts` :: `WebAudioSynth.playCatDefeat`, 신규 소비 헬퍼 — 합성음; modify
  - `apps/web/src/game/renderer.ts` :: `render` world transform — 150ms 흔들림; modify
  - `apps/web/src/game/audio.test.ts` :: 야옹·mute·단발; modify
  - `apps/web/src/game/use-chick-cannon.test.tsx` :: rAF/pause/reconnect — 통합; new
  - `apps/web/src/components/GameHud.test.tsx`, `apps/web/src/components/GameModal.test.tsx`, `apps/web/src/game/renderer.test.ts` — snapshot fixtures; modify

#### Details
- hook에서 `if(current.state!=='PAUSED')sceneTime=time`을삭제하고 renderer.render(current,current.presentationTimeMs)를호출한다. previousRAF시간은paused프레임에서도갱신해resume에delta가튀지않게한다. engine.step의presentation이유일한VFX시계다.
- `lastHandledImpactIdRef`를Canvas재연결밖에두고 각current.impacts중id>cursor만재생한다. scene교체때오래된이벤트를다시재생하지않는다. cat-hit/shield-hit→playImpact(clamped intensity/8),cat-defeat→playCatDefeat,explosion→playExplosion,butter→playBounce. `current.score>lastScore`사운드분기를삭제하고 성공한quake의즉시explosion중복도제거한다. launch/evolution상태음은유지. activateSkill는실제스킬성공시true반환하고그때만playSkill한다.
- 야옹은WebAudio외부음원없이0.28초의2개triangle/sine발진으로표현한다. 주파수기본620→900(0.04s)→260(0.28s),보조기본의0.5배·볼륨0.35배. gain은0.0001→0.07(15ms)→0.0001(280ms);요청100ms구간당최대3처치음만스케줄하고그이상이벤트는소비하되소리를겹쳐키우지않는다. muted/unlock전/closed는발진생성없음,dispose안전. 오디오mock에실제로사용한AudioParam/스케줄메서드를추가한다.
- renderer의WON/LOST일동안영구sin흔들림은삭제한다. now<shakeUntil일때만수명감쇠sin/cos변위,입력좌표와DOM은고정한다. background/ground/entity/impact전체월드를하나의transform안에서흔들되DPR/letterbox변환을보존한다. event후150ms엔정확히원점.
- runtime테스트는stub rAF로pause중큰wallclock시간→resume해도presentation이거의한프레임만증가하고,lifecycle재연결에처치음중복이없으며,staleitem/skill은효과음을재생하지않음을검증한다. 새테스트는명시cleanup한다.

## Acceptance Criteria
- [ ] 실제 접점·강도·처치점수가 있는 고유 이벤트가 중복 없이 전달된다.
- [ ] 강한충돌/처치만 60ms physics stop,150ms worldshake이며 UI는 고정이다.
- [ ] pause는 시각/물리 시간 모두 멈추고 resume/retry에 이벤트가 점프/재생되지 않는다.
- [ ] 고양이 처치마다 야옹 경로가 호출되며 mute·동시발성 제한을 지킨다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/engine.test.ts src/game/engine-gimmicks.test.ts src/game/engine-butter.test.ts src/game/engine-impact.test.ts src/game/audio.test.ts src/game/use-chick-cannon.test.tsx src/game/renderer.test.ts src/components/GameHud.test.tsx src/components/GameModal.test.tsx`
- `npm.cmd run build --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(game): add impact events hit stop and defeat audio

Plan: 2026-10-21-chicks-cannon-six-levels-and-feedback
Phase: P01-campaign-and-game-feel
Task: T04-impact-events-and-clock

- Drive reactions and audio from unique damage events
- Separate presentation time from physics for pause and hit stop
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
