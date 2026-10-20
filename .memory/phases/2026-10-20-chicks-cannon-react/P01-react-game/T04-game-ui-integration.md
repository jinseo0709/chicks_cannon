# Task: T04 React 게임 UI와 캠페인 흐름 통합

## Status: done

## Goal
React 화면에서 게임 엔진, 렌더러, 입력, 오디오를 연결하고 홈·챕터 대화·플레이 HUD·진화·패배·엔딩 화면을 완성한다.

## Decision Summary
- DOM UI는 React state로만 관리한다. 게임 상태/점수/아이템은 `ChickCannonEngine` snapshot이 원본이다.
- 첨부 HTML의 음소거, 재시작, 대화, 진화, 패배, 엔딩 흐름과 item 버튼을 유지한다.
- 반응형 목표는 데스크톱 및 모바일 portrait/landscape이며, 보드 순위 화면 진입점은 홈과 엔딩 화면이다.

## Implementation

### I01. React hook, game canvas lifecycle, audio
- Related Files:
  - `apps/web/src/game/use-chick-cannon.ts` :: `useChickCannon` — 엔진/렌더러/input lifecycle hook; new
  - `apps/web/src/game/audio.ts` :: `WebAudioSynth` — 효과음과 mute 상태; new
  - `apps/web/src/game/audio.test.ts` :: audio scheduling/mute tests; new
  - `apps/web/src/components/GameCanvas.tsx` :: `GameCanvas` — canvas/resize/RAF wiring; new

#### Details
- **Signatures & Types**:
  ```typescript
  export interface ChickCannonController {
    snapshot: GameSnapshot;
    startCampaign(): void;
    dismissDialogue(): void;
    continueAfterEvolution(): void;
    retryStage(): void;
    restartCampaign(): void;
    useItem(kind: ItemKind): void;
    toggleMute(): void;
  }
  export function useChickCannon(): ChickCannonController;
  export function GameCanvas(props: { snapshot: GameSnapshot; controller: ChickCannonController }): JSX.Element;
  ```
- Hook creates one engine, cache, renderer and input controller per mounted game; subscribes to snapshots; owns one `requestAnimationFrame` loop calling `engine.step(clampedDelta)` then renderer.render; on unmount cancels RAF, disconnects ResizeObserver, disposes listeners/cache/engine. Do not instantiate engine during every render.
- Audio recreates `WebAudioSynth` effects: stretch, launch, impact, explosion, bounce, chick skill, cat defeat and evolution fanfare. Initialize/resume AudioContext only after user gesture; `muted` prevents scheduling any nodes; avoid unhandled rejected `resume()` promises.
- Canvas loading state is shown until required SVGs finish or fail. Failed assets use renderer fallback and do not block the home/game UI.

### I02. Home, HUD, dialogs and game state UI
- Related Files:
  - `apps/web/src/App.tsx` :: `App` — `home | game | leaderboard` view state and engine mount; modify
  - `apps/web/src/components/HomeScreen.tsx` :: `HomeScreen` — title, play and leaderboard actions; new
  - `apps/web/src/components/GameHud.tsx` :: `GameHud` — chapter, form, score, ammo, item controls, mute/restart; new
  - `apps/web/src/components/DialoguePanel.tsx` :: `DialoguePanel` — chapter opening dialogue; new
  - `apps/web/src/components/GameModal.tsx` :: `EvolutionModal`, `DefeatModal`, `EndingModal` — state-bound game overlays; new
  - `apps/web/src/styles.css` :: design tokens, responsive overlays and buttons; modify
  - `apps/web/src/App.test.tsx` :: home and screen transition tests; modify
  - `apps/web/src/components/GameHud.test.tsx` :: HUD state/controls tests; new

#### Details
- **Component contracts**:
  ```typescript
  export interface HomeScreenProps { onPlay(): void; onOpenLeaderboard(): void }
  export interface GameHudProps { snapshot: GameSnapshot; onRestart(): void; onMute(): void; onUseItem(kind: ItemKind): void }
  export interface DialoguePanelProps { story: StageDefinition['story']; onContinue(): void }
  export interface GameModalProps { snapshot: GameSnapshot; onRetry(): void; onContinue(): void; onPlayAgain(): void }
  ```
- Home provides “병아리 대포”, play action, leaderboard action and brief mouse/touch slingshot instruction. `onPlay` resets a full campaign and mounts the game. `onOpenLeaderboard` is wired to the P02 screen later; for this Task keep a typed callback placeholder and no ranking API dependency.
- HUD reads stage/form/score/ammo/items from snapshot. It shows 3 or 4 chick ammo indicators and zero-ammo message; item buttons show counts and are disabled by state/quantity gates (booster only flying, quake while active stage, mega while aiming). Restart reloads current stage, sound toggle reflects muted state.
- Stage start shows speaker/avatar/story text plus chick reply; continue transitions DIALOGUE→AIMING. Evolution modal appears after stages 1–3 and shows next chick form/skill; continue loads next stage. Defeat modal distinguishes broken hostage egg from exhausted shots and offers retry-current-stage. Stage4 completion shows ending/final score and play-again.
- `GameSnapshot` includes defeat cause (`'ammo'|'hostage'|null`), current stage story/form, and evolved stage data as read-only view values; extend types in same commit so components do not access engine internals.
- Use semantic buttons/headings/dialog roles and visible keyboard focus. Canvas is labeled with an accessible description; buttons remain operable at 320px viewport. The playfield can letterbox but must not crop. Respect `prefers-reduced-motion` for overlay/float effects.
- No localStorage campaign save. Do not add login. Leaderboard button remains available on home and ending overlay; end-screen submit UI is added only in P02-T03.

### I03. UI tests and full loop check
- Related Files:
  - `apps/web/src/components/DialoguePanel.test.tsx` :: continue behavior; new
  - `apps/web/src/components/GameModal.test.tsx` :: modal state and retry/continue actions; new
  - `apps/web/src/App.test.tsx` :: home-to-game navigation; modify
- Test flow: home start→dialogue→aiming UI; play until engine state injected as EVOLUTION→continue; LOST due to ammo vs egg displays different reason; ENDING shows final score and play-again resets campaign; mute and item buttons call intended controller callbacks; no DOM access to `document.getElementById`.

## Acceptance Criteria
- [ ] Game screen presents accurate HUD and React overlays for every engine state.
- [ ] Home and ending provide leaderboard entry callbacks without blocking campaign play.
- [ ] Audio initializes only after interaction; mute, lifecycle cleanup, and reduced-motion behavior work.
- [ ] Desktop and 320px-wide mobile layouts retain full controls and play area.

## Validation
- `npm test --workspace @chicks-cannon/web -- --run src/App src/components src/game/audio` — UI/audio tests pass.
- `npm run build --workspace @chicks-cannon/web` — complete app builds.
- `npm run typecheck --workspace @chicks-cannon/web` — strict TS check passes.

## Commit Message
```text
feat(ui): connect React screens to the chick cannon campaign

Plan: 2026-10-20-chicks-cannon-react
Phase: P01-react-game
Task: T04-game-ui-integration

- Add responsive home, HUD, dialogue, evolution, defeat, and ending UI
- Wire audio, canvas, physics lifecycle, and campaign controls
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(ui): connect React screens to the chick cannon campaign

