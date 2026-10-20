# Task: T03 패럴랙스 배경 및 애니메이션

## Status: done

## Goal
기존 정적 챕터 배경을 3개 깊이 레이어로 보강하고, 노을 글로우·굴뚝 연기·새·먼지·반짝임을 반복 렌더링한다. 일시정지 시 애니메이션이 멈추고 재개 시 이어져야 한다.

## Decision Summary
- 배경은 별도 프레임워크 없이 `GameCanvasRenderer`의 Canvas 2D 장면으로 렌더한다. 기존 챕터별 색감은 유지한다.
- animation position은 `render(snapshot, sceneTime)`의 전달 시각에서 결정하고 random 값을 매 프레임 새로 생성하지 않는다. T02의 PAUSED sceneTime freeze를 사용한다.

## Implementation

### I01. 세 깊이의 배경 장면
- Related Files:
  - `apps/web/src/game/renderer.ts` :: `GameCanvasRenderer.render`, `drawBackground`, `drawFarLayer`, `drawMidLayer`, `drawNearLayer`, `drawAnimatedParticles` — 배경 장면; modify
  - `apps/web/src/game/renderer.test.ts` :: stage/time-based background; modify

#### Details
- **Signatures & Types**:
  ```ts
  private drawBackground(stage: GameSnapshot['stage'], sceneTime: number): void;
  private drawFarLayer(stage: GameSnapshot['stage'], sceneTime: number): void;
  private drawMidLayer(stage: GameSnapshot['stage'], sceneTime: number): void;
  private drawNearLayer(sceneTime: number): void;
  private drawAnimatedParticles(stage: GameSnapshot['stage'], sceneTime: number): void;
  ```
- `render(snapshot, nowMs)`는 인수 이름 `sceneTime`으로 갱신하고 3 layer와 particle draw에 동일한 시각을 전달한다. pause 상태에서는 T02가 전달하는 고정값을 사용한다.
- Stage 1~4별 기존 색감에 대응하는 하늘 gradient를 둔다: 1 맑은 하늘색/금빛, 2 푸른 회색, 3 주황 노을/공장 회색, 4 보라/금빛. `drawBackground`는 현재 fullscreen SVG를 즉시 return하는 동작을 제거하고 sky, sun, 3 layer를 모두 그린다. SVG background assets는 기존 파일로 남겨도 되며 stage palette는 renderer 안의 typed record로 고정한다.
- 원경은 낮은 대비와 haze alpha를 사용한 멀리 있는 지붕/도시 실루엣, 규칙적인 작은 lit windows로 만든다. layer drift speed 기준은 far `0.08`, mid `0.22`, near `0.45` world-pixel/ms; `sceneTime`을 주기 길이로 modulo해 seamless wrap한다.
- 중경에는 건물 지붕, 굴뚝 2개, 물탱크, 두 기둥에 연결된 빨랫줄과 작은 천 조각을 그린다. 연기 입자는 고정 seed 6개를 사용하고 시간에 따라 위쪽으로 이동하며 alpha/radius를 주기적으로 바꾼다.
- 근경은 3줄 난간을 그리고 `createLinearGradient`로 녹슨 적갈색/짙은 금속색을 섞는다. 일정 간격마다 원형 볼트를 그린다.
- 태양 중심에 `createRadialGradient` glow를 적용한다. 새 3마리는 `sceneTime` 기반 수평 왕복, 먼지 8개와 반짝임 6개는 고정 seed 위치의 sin/cos 또는 modulo 주기로 움직인다. `Math.random()`을 렌더 frame마다 호출하지 않는다.
- 모든 배경 draw는 Canvas `save/restore`를 짝지어 globalAlpha/shadowBlur/transform이 게임 오브젝트에 새지 않게 한다. `shadowBlur`는 sun에만 제한된 반경을 적용한다.

### I02. 결정적 애니메이션 테스트
- Related Files:
  - `apps/web/src/game/renderer.test.ts` :: mock context 및 animation rendering assertions — modify

#### Details
- mock Canvas context에 `createRadialGradient`, `closePath`, `bezierCurveTo`, `quadraticCurveTo`, `setLineDash` 등 실제 배경 draw가 호출하는 API를 추가한다.
- 서로 다른 `sceneTime`에서 background line/ellipse draw가 오류 없이 수행되고, 같은 sceneTime에서 고정 seed 파티클이 동일한 좌표를 사용하는지 draw arguments로 검증한다.
- T02와 통합해 `PAUSED` snapshot의 고정 sceneTime을 연속 전달하면 background draw positions가 바뀌지 않는 테스트를 둔다. renderer는 직접 시계를 생성하지 않으며 인자로 받은 값만 사용한다.

## Acceptance Criteria
- [ ] 각 stage에 맞는 하늘색/노을과 원·중·근경 레이어가 보인다.
- [ ] 원경 창문, 중경 굴뚝 연기/물탱크/빨랫줄, 근경 녹슨 볼트 난간이 렌더된다.
- [ ] 태양 glow 및 새·먼지·반짝임이 시간에 따라 움직인다.
- [ ] 같은 sceneTime은 같은 배경 frame을 만들고 pause 중 배경이 정지한다.
- [ ] Canvas 렌더러 tests와 production build가 통과한다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/renderer.test.ts` — deterministic scene rendering tests pass.
- `npm.cmd run test --workspace @chicks-cannon/web` — all web tests pass.
- `npm.cmd run build --workspace @chicks-cannon/web` — TypeScript and Vite production build pass.
- `git diff --check` — whitespace checks pass.

## Commit Message
```text
feat(game): add animated parallax rooftop backgrounds

Plan: 2026-10-20-chicks-cannon-graphics-overhaul
Phase: P01-visual-rework
Task: T03-parallax-scene

- Render far, middle and foreground rooftop layers
- Animate smoke, birds, dust, sparkles and sunset glow
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
