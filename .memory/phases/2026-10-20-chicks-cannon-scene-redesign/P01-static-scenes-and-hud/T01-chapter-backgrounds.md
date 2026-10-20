# Task: T01 챕터별 정적 테마 배경

## Status: done

## Goal
`GameCanvasRenderer`의 움직이는 패럴랙스 배경을 챕터별로 구분되는 고정 배경으로 교체한다. 배경 스크롤로 장면이 옆으로 흐르는 현상을 제거하고, 챕터 4의 꽃가루/깃털만 전달된 scene time에 따라 움직이게 한다.

## Decision Summary
- `render(snapshot, sceneTime)`의 `sceneTime`은 유지하되 배경 구조물 위치는 시간에 종속되지 않게 한다. Matter.js 시뮬레이션·pause 처리와 무관한 Canvas 장식 변경이다.
- 배경은 1280×720 좌표를 사용하고, 바닥 모양과 색상도 챕터별로 그린다. 이동 요소는 챕터 4 파티클뿐이며 좌표는 인덱스 기반 결정식으로 계산한다.

## Implementation

### I01. 시간 독립적 챕터 배경과 바닥
- Related Files:
  - `apps/web/src/game/renderer.ts` :: `render`, `drawBackground`, `drawGround`, `drawChapterOneBackground`, `drawChapterTwoBackground`, `drawChapterThreeBackground`, `drawChapterFourBackground`, `drawCloud`, `drawGear` — 정적 배경과 테마별 바닥; modify
  - `apps/web/src/game/renderer.test.ts` :: `GameCanvasRenderer` — 챕터 팔레트 및 시간 독립성; modify

#### Details
- **Signatures & Types**:
  ```ts
  render(snapshot: GameSnapshot, sceneTime: number): void;
  private drawBackground(stage: GameSnapshot['stage'], sceneTime: number): void;
  private drawGround(stage: GameSnapshot['stage']): void;
  private drawChapterOneBackground(): void;
  private drawChapterTwoBackground(): void;
  private drawChapterThreeBackground(): void;
  private drawChapterFourBackground(sceneTime: number): void;
  private drawCloud(x: number, y: number, scale: number): void;
  private drawGear(x: number, y: number, radius: number, teeth: number): void;
  ```
- `drawBackground`의 fullscreen `assets.get(background-stage)` 우선 렌더링을 제거한다. 1280×720 배경을 Canvas로 직접 그려 모든 챕터가 지정 테마를 표시하게 한다. 내부 함수는 각자 `save()`/`restore()`를 짝지어 그리기 상태를 보존한다.
- Chapter 1 `골목길 요새`: sky gradient `#a0d8ef` → `#e0f4ff`; 3개 고정 뭉게구름; 붉은 벽돌 담장을 하단 배경에 그린다. 담장은 수평/수직 모르타르 선과 일부 밝은 벽돌 면을 갖는다. 양쪽 전신주와 고정 전깃줄 3가닥을 추가한다. 바닥은 `#454b55` 계열 아스팔트에 밝은 도로 가장자리/짧은 노란 차선 표시를 두고 `drawGround(1)`에서 마감한다.
- Chapter 2 `바람 부는 고층 옥상`: sky gradient `#ff7e5f` → `#feb47b` → `#ffeccc`; 고정된 원경 도심 실루엣, 랜덤하지 않은 노란 창문 불빛, 중경 빨랫줄/천 조각/물탱크를 그린다. 배경 빌딩 x 좌표는 상수 배열이며 `sceneTime` 또는 RAF delta를 더하지 않는다. 바닥은 밝은 코랄/청록 우레탄 옥상과 짧은 안전 표시다.
- Chapter 3 `고양이 폐공장`: sky gradient `#2b1055` → `#7597de`; 고정된 보름달을 radial glow와 함께 그린다. 톱니 개수 인수 기반 `drawGear`로 공장 기어 실루엣 2개, 고정 굴뚝과 연기 없는 공장 지붕을 둔다. 바닥은 보라/남색 철판 콘크리트이며 밝은 청록 판금 경계와 리벳을 넣어 회색 단색으로 보이지 않게 한다.
- Chapter 4 `따뜻한 둥지 축제`: sky gradient `#f6d365` → `#fda085`; 고정 초록/민트 언덕과 고정 무지개를 그린다. 파티클은 정확히 14개를 인덱스 기반으로 생성하고, 각 x/y는 `sceneTime`, 고정 인덱스 seed, 서로 다른 양수 주기를 사용한 `sin`/modulo 식으로 계산한다. 8개는 꽃가루 원형, 6개는 깃털 모양 작은 곡선이며 `Math.random()`과 누적 `bgOffset`/`scrollX`는 금지한다. `sceneTime`이 같으면 같은 좌표를 그린다. 바닥은 밝은 민트 잔디/흙 경계다.
- `drawGround(stage)`는 기존의 모든 챕터 공통 갈색/초록색 띠를 제거하고 각 배경과 어울리는 정적 바닥 색/세부 표시를 선택한다. 호출 순서는 `drawBackground(stage, sceneTime)` 다음 `drawGround(stage)`를 유지한다.
- 배경 함수에서 `sceneTime * 0.08`, `sceneTime * 0.22`, `sceneTime * 0.45` 같은 이동 offset과 sun/bird/smoke/dust/sparkle 루프를 제거한다. Chapter 4 파티클만 scene time에 반응해야 한다. 게임 내 fan 효과의 `nowMs` 애니메이션은 배경이 아니므로 유지한다.

### I02. 결정적 배경 회귀 테스트
- Related Files:
  - `apps/web/src/game/renderer.test.ts` :: `GameCanvasRenderer` tests — modify

#### Details
- Canvas mock에 실제 배경 호출 API(`createRadialGradient`, `closePath`, `bezierCurveTo`, `quadraticCurveTo`, `rect`, `clip`, `setLineDash`, `globalAlpha`, `shadowBlur`)가 없다면 추가한다.
- 빈 entity/aim 상태로 stage 1, 2, 3 각각 동일 snapshot을 서로 다른 scene time에 렌더링했을 때 배경의 `fillRect`, `moveTo`, `lineTo`, `arc` 호출 좌표가 같음을 검증한다. Stage 4는 동일 scene time에서 좌표 호출이 같고 다른 scene time에서 파티클 좌표 일부가 바뀌는지 검증한다.
- 네 stage 렌더가 throw하지 않으며 챕터 색상 gradient가 각각 호출되는지 확인한다. 기존 DPR/letterbox 테스트와 SVG asset 누락 fallback 테스트를 유지한다.

## Acceptance Criteria
- [ ] 챕터마다 지정된 배경 색과 특징적 물체가 달라진다.
- [ ] 챕터 1~3 배경 좌표가 전달 시각과 무관하며 배경 스크롤을 하지 않는다.
- [ ] 챕터 4만 꽃가루 8개와 깃털 6개가 결정적으로 애니메이션된다.
- [ ] 챕터별 바닥이 정적이고 팔레트와 일치한다.
- [ ] DPR/letterbox 및 기존 Canvas fallback 동작이 유지된다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/renderer.test.ts` — background and existing renderer tests pass.
- `npm.cmd run build --workspace @chicks-cannon/web` — TypeScript and Vite production build pass.
- `git diff --check` — whitespace checks pass.

## Commit Message
```text
feat(game): add static chapter themed backgrounds

Plan: 2026-10-20-chicks-cannon-scene-redesign
Phase: P01-static-scenes-and-hud
Task: T01-chapter-backgrounds

- Replace scrolling scenery with four distinct fixed chapter themes
- Animate festival petals and feathers deterministically
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
