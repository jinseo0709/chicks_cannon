# Task: T03 동화책풍 SVG 에셋과 Canvas 렌더러

## Status: pending

## Goal
Matter.js snapshot을 반응형 1280×720 장면으로 그리며, 병아리·고양이·둥지·배경은 프로젝트 자체 SVG 원화를 사용하고 구조물·물리 효과는 Canvas로 표현한다.

## Decision Summary
- 동화책풍 2D: 따뜻한 색, 둥근 형태, 레이어가 분명한 배경, 손그림 선/음영 디테일.
- 모든 동적 물리 몸체는 Matter 좌표/회전을 따르며 SVG는 Canvas `drawImage`에 사용한다.
- 마우스와 터치는 Pointer Events로 통합하고, 좌표는 CSS 크기/DPR과 무관하게 1280×720 가상 좌표로 변환한다.

## Implementation

### I01. SVG 아트 파일과 Canvas asset cache
- Related Files:
  - `apps/web/public/assets/backgrounds/chapter-1.svg` … `chapter-4.svg` — 계절/장면별 다중 레이어 배경; new
  - `apps/web/public/assets/chicks/stage-1.svg` … `stage-4.svg` — 진화 단계별 병아리 원화; new
  - `apps/web/public/assets/cats/normal.svg`, `shield.svg`, `boss.svg` — 적 원화; new
  - `apps/web/public/assets/props/nest.svg`, `slingshot.svg`, `egg.svg` — 둥지/새총/구출 알; new
  - `apps/web/src/game/asset-cache.ts` :: `SvgAssetCache` — SVG image preload/상태 추적; new
  - `apps/web/src/game/asset-cache.test.ts` :: asset readiness tests; new

#### Details
- **Signatures & Types**:
  ```typescript
  export type AssetId = `background-${1|2|3|4}` | `chick-${1|2|3|4}` | 'cat-normal' | 'cat-shield' | 'cat-boss' | 'nest' | 'slingshot' | 'egg';
  export class SvgAssetCache {
    preload(ids: readonly AssetId[]): Promise<void>;
    get(id: AssetId): HTMLImageElement | null;
    getProgress(): { loaded: number; total: number; failed: readonly AssetId[] };
    dispose(): void;
  }
  ```
- SVG viewBox: backgrounds `0 0 1280 720`; character/prop art uses centered viewBox and transparent background. Use inline SVG primitives and gradients only; do not require a remote image/font. Add accessible `<title>` in each file. No SVG scripts, external hrefs, or embedded raster data.
- Each chapter background has far/mid/near parallax shapes composed in the 1280×720 viewBox (sky, clouds/landmark, ground); maintain contrast under game bodies. Chick assets visibly progress from round baby chick to golden crowned final form; cats distinguish normal/shield/boss by shape and silhouette.
- Asset cache preloads selected stage assets, handles `onload`/`onerror`, and returns null while missing. Renderer must retain a vector fallback (colored circle/silhouette) so a failed SVG never blocks play.

### I02. Canvas renderer and responsive pointer input
- Related Files:
  - `apps/web/src/game/renderer.ts` :: `GameCanvasRenderer` — scene composition and DPR scaling; new
  - `apps/web/src/game/pointer-input.ts` :: `PointerInputController` — drag/skill intent callbacks; new
  - `apps/web/src/game/renderer.test.ts` :: scaling/render operation tests; new
  - `apps/web/src/game/pointer-input.test.ts` :: coordinate/drag clamp tests; new

#### Details
- **Signatures & Types**:
  ```typescript
  export class GameCanvasRenderer {
    constructor(canvas: HTMLCanvasElement, assets: SvgAssetCache);
    resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void;
    render(snapshot: GameSnapshot, nowMs: number): void;
    dispose(): void;
  }
  export interface GameInputHandlers { onAimStart(point: Point): void; onAimMove(point: Point): void; onAimEnd(): void; onSkill(): void }
  export class PointerInputController {
    constructor(canvas: HTMLCanvasElement, handlers: GameInputHandlers);
    setMode(state: GameState): void;
    dispose(): void;
  }
  ```
- Renderer sets backing dimensions to `round(cssWidth*dpr)` and `round(cssHeight*dpr)`; clear in backing coordinates, then set transform `dpr * min(cssWidth/1280, cssHeight/720)` and centered letterbox offsets. Convert input as inverse of same scale/offset. Keep canvas CSS aspect ratio 16:9; in mobile portrait, fit width/height without cropping and leave letterbox bars.
- Render order: chapter background SVG; ground/props/nest/slingshot; parallax/aim guide; blocks with type-specific wood/stone/glass/TNT surfaces and rotation; shutters/trampoline/boulder/fans; eggs; cats; chick sprite; particle/floating-text effects; screen shake as camera transform. Apply Matter position and angle to SVG-derived sprites with `drawImage` transforms. Draw trajectory from current aim using launch formula and gravity.
- Pointer events use `setPointerCapture`; map client coords to virtual coordinates; clamp aim to 125 from cannon; on pointer cancel call `onAimEnd`; only start drag in 90px cannon radius while AIMING; in-flight pointer down invokes one-shot skill. Set `touch-action:none` on canvas only, and remove all listeners on dispose.
- Canvas drawing stays inside `save/restore`; renderer does not advance Matter physics (engine `step` does). Use `ResizeObserver` and a single animation loop owned by the React integration task.

## Acceptance Criteria
- [ ] SVG assets are all local, loaded without network dependencies, and have fallback rendering when an image fails.
- [ ] Canvas respects Matter transforms and renders the stated layers/effects without modifying the physics world.
- [ ] Desktop and portrait mobile preserve the full playfield and correct drag trajectory under letterboxing and DPR scaling.
- [ ] Input controller handles mouse/touch/pointer cancel and releases every listener on dispose.

## Validation
- `npm test --workspace @chicks-cannon/web -- --run src/game/asset-cache src/game/renderer src/game/pointer-input` — asset, transform and input tests pass.
- `npm run build --workspace @chicks-cannon/web` — SVG assets copied and app builds.

## Commit Message
```text
feat(art): render the game with local storybook SVG assets

Plan: 2026-10-20-chicks-cannon-react
Phase: P01-react-game
Task: T03-canvas-svg-renderer

- Add original chapter, chick, cat, and prop SVG artwork
- Render physics snapshots responsively with pointer-based controls
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
