# Task: T02 Synthesized Game BGM

## Status: done

## Goal
Add a quiet, original looping background arrangement that evokes a warm, playful adventure and follows existing Web Audio unlock, mute, pause, and disposal behavior.

## Decision Summary
- Use the existing `WebAudioSynth` and Web Audio oscillator/gain nodes; do not add dependencies or external audio files.
- Start music after an existing explicit `unlock()` gesture, keep it quiet beneath effects, stop scheduling while muted or paused, and close all resources on disposal.

## Implementation

### I01. Add a looped music scheduler to the synth
- Related Files:
  - `apps/web/src/game/audio.ts` :: `WebAudioSynth`, private note scheduling; modify
  - `apps/web/src/game/audio.test.ts` :: existing audio coverage; read-only unless validation requires a specific fix

#### Details
- Preserve existing sound-effect methods and their direct output to `context.destination`.
- Add a dedicated music output gain node created lazily after `unlock()` successfully creates/resumes the context. Initialize it to a quiet level around 0.12 and connect it to `context.destination`.
- Add `setMusicPaused(paused: boolean): void`. Pause stops the timer and fades music output to zero over roughly 0.15 seconds. Resume only if the context is unlocked and not muted; restart the arrangement at its next bar boundary.
- Begin the arrangement from `unlock()` after a usable running context exists. Do not instantiate audio or schedule anything before unlock.
- Add a scheduler that checks about every 40 ms and schedules notes up to 120 ms ahead against `AudioContext.currentTime`, using a 250 ms eighth-note grid. Keep a deterministic 32-step (8 second) loop and wrap the step index after 32.
- Use a bright major-pentatonic melody in a middle register with short sine/triangle plucks, occasional higher bell accents, a soft low bass note at each 4-step bar start, and a very soft filtered/noise-like or low sine percussion pulse every 4 steps. Keep the note and drum levels below sound-effect levels.
- Route only music notes through the dedicated music gain node. Note envelopes must fade in quickly and decay naturally, avoiding clicks. The scheduler must not create overlapping timers.
- `setMuted(true)` stops scheduling and ramps the music output to zero; `setMuted(false)` may resume only if audio has already been unlocked and game music is not paused. Respect a closed context.
- `dispose()` clears the timer, stops future scheduling, disconnects/closes the context using the existing cleanup path, and resets scheduler state.
- Avoid touching application screen navigation, score, or SFX behavior.

### I02. Connect gameplay pause and mute state
- Related Files:
  - `apps/web/src/game/use-chick-cannon.ts` :: runtime `animate`, `toggleMute`, `togglePause`; modify

#### Details
- After reading `current` in `animate`, call `audioRef.current?.setMusicPaused(current.state === 'PAUSED')`; the synth method must be idempotent so this per-frame call never creates duplicate intervals.
- Existing `startCampaign`, `selectStage`, and `dismissDialogue` already call `unlock()` from user gestures. Keep those unlock calls; BGM starts on the first successful one.
- After `toggleMute()` updates engine mute state, continue forwarding the new value to `setMuted`.
- Existing cleanup calls `audio.dispose()`; retain it.

### I03. Verify the implementation
- Related Files:
  - `apps/web/src/game/audio.ts` :: scheduler and gain lifecycle; modify
  - `apps/web/src/game/use-chick-cannon.ts` :: pause/mute wiring; modify

#### Details
- TypeScript compilation and the production web build must succeed.
- Check the code paths: no audio before unlock; one loop after unlock; mute and pause stop new music notes; unmute/resume do not duplicate the timer; disposal prevents any later scheduling.

## Acceptance Criteria
- [x] A warm, playful synthesized BGM loop starts on the first existing audio-unlock gesture.
- [x] Music remains quieter than game effects and loops without gaps or timer duplication.
- [x] Mute silences music and effects; pause silences music until resume.
- [x] No dependency or external music asset is introduced.
- [x] Production web build succeeds.

## Validation
- `npm.cmd run build --workspace @chicks-cannon/web` — must complete without TypeScript or Vite errors.

## Commit Message
```text
feat(audio): 포근한 모험풍 배경음악 추가

Plan: 2026-10-29-pull-face-and-bgm
Phase: P01-pull-feedback-and-music
Task: T02-synthesized-game-bgm

- Web Audio로 짧은 멜로디와 반주를 반복 합성
- 음소거·일시정지·정리 상태를 배경음에 연결
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
