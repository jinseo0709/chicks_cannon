import { useCallback, useEffect, useRef, useState } from 'react';
import { WebAudioSynth } from './audio';
import { SvgAssetCache, stageAssetIds } from './asset-cache';
import { ChickCannonEngine } from './engine';
import { PointerInputController } from './pointer-input';
import { GameCanvasRenderer } from './renderer';
import { CHICK_FORMS, STAGE_SCORE_TARGETS } from './constants';
import { emptyItemInventory } from './items';
import { STAGES } from './stages';
import type { GameSnapshot, ItemKind } from './types';

export interface ChickCannonController {
  snapshot: GameSnapshot;
  assetsReady: boolean;
  attachCanvas(canvas: HTMLCanvasElement | null): void;
  startCampaign(): void;
  selectStage(stage: GameSnapshot['stage'], replay?: boolean): void;
  dismissDialogue(): void;
  continueAfterEvolution(): void;
  retryStage(): void;
  restartCampaign(): void;
  claimFinalReward(kind: ItemKind): void;
  useItem(kind: ItemKind): void;
  toggleMute(): void;
  togglePause(): void;
}

const initialSnapshot: GameSnapshot = {
  screen: 'game',
  stage: 1,
  score: 0,
  stageScore: 0,
  scoreTarget: STAGE_SCORE_TARGETS[1],
  stageAmmo: STAGES[1].ammo,
  stageStars: 0,
  bonusChallengeRemainingMs: STAGES[1].bonusChallenge.timeLimitMs,
  bonusChallengeStatus: 'ready',
  ammo: STAGES[1].ammo,
  campaignComplete: false,
  state: 'DIALOGUE',
  items: emptyItemInventory(),
  eggCushionActive: false,
  finalRewardClaimed: false,
  targetingItem: null,
  slickZones: [],
  scorePopups: [],
  muted: false,
  entities: [],
  aimPosition: null,
  megaNext: false,
  boosterNext: false,
  quakeNext: false,
  skillCooldownRemainingMs: 0,
  defeatCause: null,
  story: STAGES[1].story,
  form: CHICK_FORMS[1],
  evolvedForm: null,
};

export function useChickCannon(): ChickCannonController {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [assetsReady, setAssetsReady] = useState(false);
  const engineRef = useRef<ChickCannonEngine | null>(null);
  const assetsRef = useRef<SvgAssetCache | null>(null);
  const audioRef = useRef<WebAudioSynth | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopRuntimeRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<PointerInputController | null>(null);

  const attachCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvasRef.current === canvas && (!canvas || stopRuntimeRef.current)) return;
    stopRuntimeRef.current?.();
    stopRuntimeRef.current = null;
    canvasRef.current = canvas;
    const engine = engineRef.current;
    const assets = assetsRef.current;
    if (!canvas || !engine || !assets) return;

    const renderer = new GameCanvasRenderer(canvas, assets);
    const input = new PointerInputController(canvas, {
      onAimStart: (point) => engine.setAim(point),
      onAimMove: (point) => engine.setAim(point),
      onAimEnd: () => engine.releaseAim(),
      onAimCancel: () => engine.cancelAim(),
      onTarget: (point) => {
        if (engine.applyTargetedItem(point)) audioRef.current?.playBounce();
      },
      onTargetCancel: () => engine.cancelTargetedItem(),
      onSkill: () => {
        engine.activateSkill();
        audioRef.current?.playSkill(engine.getSnapshot().stage);
      },
      onUseItem: (kind) => {
        void audioRef.current?.unlock();
        if (!engine.useItem(kind)) return;
        if (kind === 'quake') audioRef.current?.playExplosion();
        else if (kind === 'booster') audioRef.current?.playSkill(2);
        else if (kind === 'mega') audioRef.current?.playBounce();
      },
      onQuickRestart: () => {
        void audioRef.current?.unlock();
        engine.retryStage();
        engine.dismissDialogue();
      },
    });
    inputRef.current = input;
    input.setMode(engine.getSnapshot().state, engine.getSnapshot().targetingItem);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width || 1, rect.height || 1, window.devicePixelRatio || 1);
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(canvas);
    window.addEventListener('resize', resize);
    resize();

    let frameId = 0;
    let previousTime = 0;
    let sceneTime = 0;
    let lastState = engine.getSnapshot().state;
    let lastScore = engine.getSnapshot().score;
    let lastBossDamageId = 0;
    const animate = (time: number) => {
      const delta = previousTime === 0 ? 16.667 : Math.min(time - previousTime, 33.333);
      previousTime = time;
      engine.step(delta);
      const current = engine.getSnapshot();
      audioRef.current?.setMusicPaused(current.state === 'PAUSED');
      if (current.state !== 'PAUSED') sceneTime = time;
      input.setMode(current.state, current.targetingItem);
      if (current.state !== lastState) {
        if (current.state === 'FLYING') audioRef.current?.playLaunch();
        if (current.state === 'WON' && current.stage === 6) audioRef.current?.playVictoryFanfare();
        if (current.state === 'EVOLUTION' || (current.state === 'ENDING' && current.stage !== 6)) audioRef.current?.playEvolution();
        if (current.state === 'LOST') audioRef.current?.playExplosion();
        lastState = current.state;
      }
      const damagePopups = current.bossDamagePopups ?? [];
      const latestBossDamage = damagePopups[damagePopups.length - 1];
      if (latestBossDamage && latestBossDamage.id > lastBossDamageId) {
        audioRef.current?.playBossHit();
        lastBossDamageId = latestBossDamage.id;
      }
      if (current.score > lastScore) audioRef.current?.playImpact(Math.min(8, current.score - lastScore));
      lastScore = current.score;
      renderer.render(current, sceneTime);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    stopRuntimeRef.current = () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      input.dispose();
      inputRef.current = null;
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const assets = new SvgAssetCache();
    const audio = new WebAudioSynth();
    const engine = new ChickCannonEngine((current) => {
      setSnapshot(current);
      inputRef.current?.setMode(current.state, current.targetingItem);
    });
    assetsRef.current = assets;
    audioRef.current = audio;
    engineRef.current = engine;
    if (canvasRef.current) attachCanvas(canvasRef.current);
    return () => {
      stopRuntimeRef.current?.();
      stopRuntimeRef.current = null;
      engine.dispose();
      assets.dispose();
      audio.dispose();
      engineRef.current = null;
      assetsRef.current = null;
      audioRef.current = null;
    };
  }, [attachCanvas]);

  useEffect(() => {
    const assets = assetsRef.current;
    if (!assets) return;
    let mounted = true;
    setAssetsReady(false);
    void assets.preload(stageAssetIds(snapshot.stage)).then(() => {
      if (mounted) setAssetsReady(true);
    });
    return () => { mounted = false; };
  }, [snapshot.stage]);

  const startCampaign = useCallback(() => {
    void audioRef.current?.unlock();
    engineRef.current?.startCampaign();
  }, []);
  const selectStage = useCallback((stage: GameSnapshot['stage'], replay = false) => {
    void audioRef.current?.unlock();
    engineRef.current?.selectStage(stage, replay);
  }, []);
  const dismissDialogue = useCallback(() => {
    void audioRef.current?.unlock();
    engineRef.current?.dismissDialogue();
  }, []);
  const continueAfterEvolution = useCallback(() => engineRef.current?.continueAfterEvolution(), []);
  const retryStage = useCallback(() => engineRef.current?.retryStage(), []);
  const restartCampaign = useCallback(() => {
    void audioRef.current?.unlock();
    engineRef.current?.restartCampaign();
  }, []);
  const claimFinalReward = useCallback((kind: ItemKind) => engineRef.current?.claimFinalReward(kind), []);
  const useItem = useCallback((kind: ItemKind) => {
    void audioRef.current?.unlock();
    if (!engineRef.current?.useItem(kind) || kind === 'butter' || kind === 'cushion') return;
    if (kind === 'quake') audioRef.current?.playExplosion();
    else if (kind === 'booster') audioRef.current?.playSkill(2);
    else audioRef.current?.playBounce();
  }, []);
  const toggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
    audioRef.current?.setMuted(engineRef.current?.getSnapshot().muted ?? false);
  }, []);
  const togglePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.getSnapshot().state === 'PAUSED') engine.resume();
    else engine.pause();
  }, []);

  return {
    snapshot,
    assetsReady,
    attachCanvas,
    startCampaign,
    selectStage,
    dismissDialogue,
    continueAfterEvolution,
    retryStage,
    restartCampaign,
    claimFinalReward,
    useItem,
    toggleMute,
    togglePause,
  };
}
