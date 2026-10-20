# Task: T02 오브젝트 배치와 입체감

## Status: pending

## Goal
둥지를 적 요새 뒤쪽 우측 지면으로 옮기고, 셔터를 천장 지지대에 연결하며, 새총과 목재/금속 구조물의 두께·접지감을 강화한다. 화면의 오브젝트 크기만 바꾸고 Matter.js 물리 크기는 유지한다.

## Decision Summary
- 둥지 월드 중심은 `(1205,620)`, 시각 크기는 `130×80`이다. Stage 4 구조물 오른쪽 끝이 x≈1135라 간격을 확보하고 월드 오른쪽 10px 여백을 둔다.
- stage entity의 `width`, `height`, `radius`는 물리 본체의 치수다. 새로 그리는 블록 외곽만 최대 8px 두껍게 하며 엔진, spawn spec, Matter body를 수정하지 않는다.

## Implementation

### I01. 둥지와 새총 바닥 받침
- Related Files:
  - `apps/web/src/game/constants.ts` :: `WORLD.nest` — 장면 우측 지면 좌표; modify
  - `apps/web/src/game/renderer.ts` :: `render`, `drawProp`, `drawSlingshotBase` — props 위치와 받침; modify
  - `apps/web/public/assets/props/slingshot.svg` — 굵은 Y자 목재와 가죽 파우치 일러스트; modify
  - `apps/web/src/game/renderer.test.ts` :: prop positions; modify

#### Details
- **Signatures & Types**:
  ```ts
  private drawProp(id: 'nest' | 'slingshot', x: number, y: number, width: number, height: number): void;
  private drawSlingshotBase(x: number, y: number): void;
  ```
- `WORLD.nest`를 `{x:1205,y:620}`으로 변경한다. `render`의 nest 호출은 `drawProp('nest', WORLD.nest.x, WORLD.nest.y, 130, 80)`을 사용한다. 현재 `drawProp` 중심 배치 수식대로 이미지 영역은 x=1140..1270, y=580..660이다.
- `drawSlingshotBase`는 slingshot asset보다 먼저 호출해 cannon 발밑의 둥근 황토/목재 받침과 짧은 민트 풀잎을 그린다. 장전 병아리 위치, `WORLD.cannon`, 조준선 좌표는 바꾸지 않는다.
- `slingshot.svg`의 viewBox는 유지한다. Y자 주 기둥은 기존보다 넓은 gradient 목재 획과 외곽선을 사용하고, 두 팔 사이에 어두운 가죽 파우치, 가장자리 하이라이트와 2~3개의 stitch 표시를 넣는다. 기존 SVG fallback의 나무 Y는 image 누락 시에도 두꺼운 선과 둥근 join으로 표현한다.
- `renderer.test.ts`는 mocked `assets.get`/`drawImage`를 확인해 nest draw 위치 `(1140,580,130,80)`를 검증한다. Slingshot props 및 loaded chick 검증을 유지한다.

### I02. 셔터 지지대, 블록 두께, 팝 컬러와 접지 그림자
- Related Files:
  - `apps/web/src/game/renderer.ts` :: `drawEntity`, `drawEntityShadow`, `drawBlock`, `drawShutter`, `drawShutterSupport` — support, visual thickness and shadows; modify
  - `apps/web/src/game/constants.ts` :: `BLOCK_CONFIG` — visual `fill`/`stroke` colors only; modify
  - `apps/web/src/game/renderer.test.ts` :: shutter supports, visual bounds, shadows; modify

#### Details
- **Signatures & Types**:
  ```ts
  private drawShutterSupport(entity: GameEntityView): void;
  private drawBlock(entity: GameEntityView): void;
  private drawEntityShadow(entity: GameEntityView): void;
  ```
- `drawEntity`에서 kind가 `shutter`일 때 Canvas world transform 이전에 `drawShutterSupport(entity)`를 호출하고 기존 `drawShutter`는 계속 entity center에서 그린다.
- Support는 entity.x에 고정되는 상단 beam y=170, 폭 100px, 높이 16px; 양끝의 2개 지지 브래킷과 중앙 도르래 원형 휠을 그린다. 어두운 와이어를 pulley 아래에서 현재 셔터 상단 `(entity.x, entity.y - (entity.height ?? 140)/2)`까지 잇는다. stage2/4에서 셔터가 움직여도 와이어 끝만 현재 상단을 따라간다. 구현은 렌더링 전용이고 새로운 physics entity를 만들지 않는다.
- `drawBlock`에서 base width/height를 읽은 뒤 시각 width는 `baseWidth + min(8, baseWidth*0.12)`, 시각 height는 `baseHeight + min(6, baseHeight*0.08)`로 그린다. entity와 Matter body의 원래 치수는 변경하지 않는다. 목재 grain/knot/highlight, stone metallic gradient/rivets/AO를 유지하며 밝은 팝 컬러 강조선을 적용한다.
- `BLOCK_CONFIG`에서 `fill`/`stroke` 두 색 필드만 고채도 팔레트로 바꾼다: wood `#ee963d/#754226`, stone `#469bb8/#164e68`, glass `#68d9e5/#117d9b`, TNT `#f04455/#8c2637`. 각 `hp`와 `density` 수치는 원본 그대로다. Chapter 3 renderer metallic gradient는 남색 바탕에 밝은 보라/청록 edge를 쓴다.
- `drawEntityShadow`는 기존 대상(cat/block/chick/egg/boulder)과 `rgba(0, 0, 0, 0.25)` 접지 그림자를 유지하며 entity body보다 먼저 호출된다. 블록에는 밝은 상단 모서리와 어두운 하단/접촉 edge를 남긴다.
- renderer tests는 shutter snapshot 한 개에 대해 beam/pulley/wire stroke 호출을 확인한다. wooden block의 `roundRect` 치수가 물리 크기보다 커졌고 `ellipse` shadow가 그려짐을 확인한다. `BLOCK_CONFIG`의 hp/density 값은 변경되지 않았는지 테스트 또는 기존 테스트에서 검증한다.

## Acceptance Criteria
- [ ] 둥지가 지정된 우측 좌표와 크기에 있고 월드 밖으로 잘리지 않는다.
- [ ] 새총이 두꺼운 Y자 나무와 파우치, 바닥 받침/풀로 읽힌다.
- [ ] 움직이는 셔터마다 고정 빔·도르래와 현재 위치까지 이어진 와이어가 보인다.
- [ ] 블록은 두꺼워 보이고 채도 높은 재질색·나이테·리벳·그림자가 있지만 collision/body 크기는 동일하다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/renderer.test.ts` — object rendering tests pass.
- `npm.cmd run build --workspace @chicks-cannon/web` — TypeScript and Vite production build pass.
- `git diff --check` — whitespace checks pass.

## Commit Message
```text
feat(game): improve prop placement and object depth

Plan: 2026-10-20-chicks-cannon-scene-redesign
Phase: P01-static-scenes-and-hud
Task: T02-object-depth

- Move the nest behind the fortress and support moving shutters
- Add vivid dimensional props and blocks without changing physics
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
