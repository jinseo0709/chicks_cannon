import { describe, expect, it, vi } from 'vitest';
import { ChickCannonEngine } from './engine';
import { STAGES } from './stages';
import type { GameSnapshot } from './types';

function createEngine() {
  let current: GameSnapshot | undefined;
  const onSnapshot = vi.fn((snapshot: GameSnapshot) => {
    current = snapshot;
  });
  const engine = new ChickCannonEngine(onSnapshot);
  const snapshot = () => current as GameSnapshot;
  return { engine, onSnapshot, snapshot };
}

describe('ChickCannonEngine', () => {
  it('starts the campaign in dialogue and launches with clamped drag power', () => {
    const { engine, snapshot } = createEngine();
    expect(snapshot().state).toBe('DIALOGUE');
    expect(snapshot().ammo).toBe(STAGES[1].ammo);

    engine.dismissDialogue();
    engine.setAim({ x: -400, y: 525 });
    expect(snapshot().aimPosition).toEqual({ x: 35, y: 525 });
    engine.releaseAim();
    expect(snapshot().state).toBe('FLYING');
    expect(snapshot().ammo).toBe(2);
    expect(snapshot().entities.some((entity) => entity.kind === 'chick')).toBe(true);
    engine.dispose();
  });

  it('rejects a short launch and allows a skill only once per shot', () => {
    const { engine, snapshot } = createEngine();
    engine.dismissDialogue();
    engine.setAim({ x: 150, y: 525 });
    engine.releaseAim();
    expect(snapshot().state).toBe('AIMING');
    expect(snapshot().ammo).toBe(3);

    engine.setAim({ x: 80, y: 500 });
    engine.releaseAim();
    const entitiesBeforeSkill = snapshot().entities.length;
    engine.activateSkill();
    const entitiesAfterSkill = snapshot().entities.length;
    engine.activateSkill();
    expect(entitiesAfterSkill - entitiesBeforeSkill).toBe(3);
    expect(snapshot().entities).toHaveLength(entitiesAfterSkill);
    engine.dispose();
  });

  it('enforces item state and quantity gates, and restarts the campaign cleanly', () => {
    const { engine, snapshot } = createEngine();
    engine.useItem('booster');
    engine.useItem('mega');
    expect(snapshot().items).toEqual({ booster: 1, quake: 1, mega: 1 });
    engine.dismissDialogue();
    engine.useItem('mega');
    expect(snapshot().items.mega).toBe(0);
    engine.useItem('mega');
    expect(snapshot().items.mega).toBe(0);
    engine.restartCampaign();
    expect(snapshot().stage).toBe(1);
    expect(snapshot().state).toBe('DIALOGUE');
    expect(snapshot().score).toBe(0);
    expect(snapshot().items).toEqual({ booster: 1, quake: 1, mega: 1 });
    engine.dispose();
  });

  it('retains spent items and campaign score across a stage retry', () => {
    const { engine, snapshot } = createEngine();
    engine.useItem('quake');
    engine.retryStage();
    expect(snapshot().stage).toBe(1);
    expect(snapshot().ammo).toBe(3);
    expect(snapshot().items.quake).toBe(0);
    engine.dispose();
  });

  it('freezes the simulation and restores the prior active state on resume', () => {
    const { engine, snapshot, onSnapshot } = createEngine();
    engine.dismissDialogue();
    engine.setAim({ x: 80, y: 500 });
    engine.releaseAim();
    engine.step(16.667);
    const before = snapshot();
    engine.pause();
    expect(snapshot().state).toBe('PAUSED');
    const publishCount = onSnapshot.mock.calls.length;
    engine.useItem('quake');
    engine.setAim({ x: 30, y: 300 });
    engine.releaseAim();
    engine.activateSkill();
    engine.step(33.333);
    expect(snapshot().items.quake).toBe(1);
    expect(snapshot().entities).toEqual(before.entities);
    expect(onSnapshot).toHaveBeenCalledTimes(publishCount);
    engine.resume();
    expect(snapshot().state).toBe('FLYING');
    engine.pause();
    engine.retryStage();
    expect(snapshot().state).toBe('DIALOGUE');
    engine.dispose();
  });
});
