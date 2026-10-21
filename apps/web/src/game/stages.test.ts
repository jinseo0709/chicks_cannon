import { describe, expect, it } from 'vitest';
import { STAGES } from './stages';
import { ChickCannonEngine } from './engine';
import { CHICK_FORMS, STAGE_ORDER } from './constants';
import type { GameStage } from './types';

describe('campaign stage data', () => {
  it('contains six distinct destinations with their ammunition and shared chick forms', () => {
    expect(Object.keys(STAGES)).toHaveLength(6);
    expect(STAGE_ORDER.map((stage) => STAGES[stage].ammo)).toEqual([3, 3, 4, 4, 5, 5]);
    expect(new Set(Object.values(STAGES).map((stage) => stage.theme)).size).toBe(6);
    expect(STAGE_ORDER.map((stage) => CHICK_FORMS[stage].formId)).toEqual(['baby', 'baby', 'breeze', 'breeze', 'fighter', 'golden']);
  });

  it('keeps all required special objects and protected targets in the campaign', () => {
    const allSpawns = Object.values(STAGES).flatMap((stage) => stage.spawns);
    expect(allSpawns.some((spawn) => spawn.kind === 'fan')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'shutter')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'tire')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'gear')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'chandelier')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'egg')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'cat' && spawn.shield)).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'block' && spawn.material === 'tnt')).toBe(true);
  });

  it.each(STAGE_ORDER)('keeps level %s stable for two seconds before the first shot', (stage) => {
    const engine = new ChickCannonEngine(() => undefined);
    const harness = engine as unknown as { stage: GameStage; loadStage(stage: GameStage): void; publish(): void };
    try {
      harness.stage = stage;
      harness.loadStage(stage);
      engine.dismissDialogue();
      for (let frame = 0; frame < 120; frame += 1) engine.step(16.667);
      const current = engine.getSnapshot();
      expect(current.state).toBe('AIMING');
      expect(current.score).toBe(0);
      expect(current.entities.filter((entity) => entity.kind === 'egg')).toHaveLength(STAGES[stage].spawns.filter((spec) => spec.kind === 'egg').length);
      expect(current.entities.filter((entity) => entity.kind === 'chandelier').every((entity) => entity.attached)).toBe(true);
      expect(current.entities.filter((entity) => entity.material === 'tnt')).toHaveLength(STAGES[stage].spawns.filter((spec) => spec.material === 'tnt').length);
    } finally {
      engine.dispose();
    }
  });

  it('uses complete story and coordinate data for every chapter', () => {
    for (const stage of Object.values(STAGES)) {
      expect(stage.title.length).toBeGreaterThan(0);
      expect(stage.story.speaker.length).toBeGreaterThan(0);
      expect(stage.story.text.length).toBeGreaterThan(0);
      expect(stage.story.chickReply.length).toBeGreaterThan(0);
      expect(stage.spawns.length).toBeGreaterThan(0);
      for (const spawn of stage.spawns) {
        expect(Number.isFinite(spawn.x)).toBe(true);
        expect(Number.isFinite(spawn.y)).toBe(true);
      }
    }
  });
});
