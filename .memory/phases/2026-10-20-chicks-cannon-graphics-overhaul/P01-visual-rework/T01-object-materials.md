# Task: T01 오브젝트 재질·그림자 개선

## Status: done

## Goal
현재 Canvas 렌더러에서 목재/석재 블록, 새총, 둥지, 알과 게임 캐릭터를 재질감 있는 카툰 그래픽으로 그린다. 조준 중 병아리를 계속 보이고, 둥지를 장애물과 떨어진 지정 위치로 옮긴다.

## Decision Summary
- 물리 바디와 게임 규칙은 수정하지 않는다. 1280×720 월드 좌표와 기존 Matter.js snapshot을 그대로 사용한다.
- 재질 세부 효과는 Canvas 2D에서 그리고, 둥지·새총·알에 연결된 기존 SVG도 풍부한 벡터 일러스트로 개선한다.
- 둥지 중심은 `WORLD.nest = { x: 360, y: 620 }`로 옮긴다. 각 챕터의 장애물과 떨어져 있고, 지면 위쪽에 놓인다.

## Implementation

### I01. 장면 props 및 장전 병아리
- Related Files:
  - `apps/web/src/game/constants.ts` :: `WORLD.nest` — 둥지 좌표; modify
  - `apps/web/src/game/renderer.ts` :: `GameCanvasRenderer.render`, `drawProp`, `drawSprite`, `drawLoadedChick` — 둥지/새총/장전 병아리 표시; modify
  - `apps/web/public/assets/props/nest.svg` :: 기존 viewBox `-90 -55 180 110` — 겹친 짚과 하이라이트; modify
  - `apps/web/public/assets/props/slingshot.svg` :: 기존 SVG — 입체 목재 기둥과 가죽 밴드; modify
  - `apps/web/public/assets/props/egg.svg` :: 기존 SVG — 부드러운 구체 음영과 반사광; modify
  - `apps/web/src/game/renderer.test.ts` :: `GameCanvasRenderer` — 정적 props와 장전 병아리 검증; modify

#### Details
- `WORLD.nest`의 `x`를 `360`, `y`를 `620`으로 바꾼다. 게임 월드 좌표를 변경하는 것뿐이며 둥지는 정적 장식으로 유지한다.
- 렌더 순서는 배경 → 지면 → 접지 그림자 → 둥지/새총 → 조준선 → 조준 중 병아리 → Matter 엔티티로 유지한다. 장전 병아리가 조준선에 가려지지 않도록 조준선 뒤에 그린다.
- `drawLoadedChick(snapshot: GameSnapshot): void`를 추가한다. 조건은 `snapshot.state === 'AIMING' && snapshot.ammo > 0`이다. 위치는 `snapshot.aimPosition ?? WORLD.cannon`, stage sprite는 `snapshot.stage`, 반경은 `snapshot.form.radius`를 사용한다. 기존 `drawSprite` 경로를 재사용하고 합성 `GameEntityView`를 만들어 물리 월드에는 추가하지 않는다.
- `drawProp('nest', ...)`은 `WORLD.nest`의 새 좌표에서 기존 크기 180×110으로 그린다. `drawProp('slingshot', ...)`는 기존 78×136 배치를 유지하며 asset SVG의 새 목재/가죽 디테일을 표시한다.
- nest SVG는 겹친 짚 가닥, 교차 결, 굵기/색이 다른 앞쪽 짚, 중앙 깔개를 사용한다. slingshot SVG는 밝은 윗면, 짙은 옆면/기둥, 양쪽 가죽 밴드와 재봉 점선을 사용한다. egg SVG에는 `radialGradient`, 한쪽 반사광 타원, 얇은 외곽선을 둔다.

### I02. 블록 재질 및 접지 음영
- Related Files:
  - `apps/web/src/game/renderer.ts` :: `drawEntity`, `drawSprite`, `drawBlock`, `drawShutter`, `drawBoulder`, `drawEntityShadow` — 재질 및 그림자; modify
  - `apps/web/src/game/renderer.test.ts` :: shadow/texture 렌더 검증; modify

#### Details
- **Signatures & Types**:
  ```ts
  private drawEntityShadow(entity: GameEntityView): void;
  private drawLoadedChick(snapshot: GameSnapshot): void;
  ```
- `drawEntityShadow`는 alive인 `cat`, `block`, `chick`, `egg`, `boulder`에 대해 본체보다 먼저 호출한다. 블록 크기는 `width/height`, 원형은 `radius`를 사용해 중심 아래에 타원을 그리고 fill은 `rgba(0, 0, 0, 0.25)`로 한다. 타원 반경은 오브젝트 폭의 약 0.45, 높이의 약 0.12로 제한해 작은 sprite 그림자가 과도하게 커지지 않게 한다.
- 목재 `drawBlock`은 기존 대각 그라데이션 위에 불투명 clipping 없이 프레임당 고정 위치의 곡선 나뭇결 2~3개, 작은 타원 나이테, 옅은 베이지 상단 edge, 어두운 하단 edge를 추가한다. `nowMs`에 따라 목재 질감 위치가 바뀌지 않게 한다.
- 석재 블록과 shutter에는 어두운 가장자리/밝은 중앙의 metallic gradient, 네 모서리 리벳, 아래/오른쪽 얇은 AO edge를 그린다. `glass`와 `tnt` 기존 표현은 유지하되 outer stroke와 그림자를 유지한다.
- 각 엔티티의 `ctx.save()`/`ctx.restore()` 경계 안에서 스타일 상태를 복원해 다음 오브젝트의 shadow, line width, alpha가 새지 않게 한다.
- `renderer.test.ts`의 Canvas context mock에 사용되는 `createRadialGradient`, `ellipse`, `quadraticCurveTo`, `closePath`, `clip` 등 필요한 API를 추가하고, SVG 누락 fallback에서도 렌더링이 throw하지 않는 기존 조건을 유지한다.

## Acceptance Criteria
- [ ] 조준 중 현재 stage 병아리가 새총에서 항상 보이며 발사 후에는 기존 active chick만 표시된다.
- [ ] 둥지는 x=360, y=620에 있고 기존 4개 챕터의 구조물과 겹치지 않는다.
- [ ] 둥지, 새총, 알 SVG에 재질 디테일과 알 radial 음영이 있다.
- [ ] 목재/석재/metal 관련 Canvas 렌더에 하이라이트, 질감, 리벳/AO가 있고 지정된 entity에 타원 그림자가 있다.
- [ ] 렌더러의 Canvas SVG-missing fallback과 기존 DPR/letterbox 동작이 유지된다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/renderer.test.ts` — renderer tests pass.
- `npm.cmd run build --workspace @chicks-cannon/web` — TypeScript and Vite production build pass.
- `git diff --check` — whitespace checks pass.

## Commit Message
```text
feat(game): add dimensional cartoon object rendering

Plan: 2026-10-20-chicks-cannon-graphics-overhaul
Phase: P01-visual-rework
Task: T01-object-materials

- Add material details and contact shadows to Canvas objects
- Keep the loaded chick visible and move the nest clear of structures
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
