import { describe, expect, it } from 'vitest';
import { STAGES } from './stages';
import { ChickCannonEngine } from './engine';
import { CHICK_FORMS, STAGE_ORDER } from './constants';
import type { GameStage } from './types';

describe('campaign stage data', () => {
  it('contains six distinct destinations with their ammunition and shared chick forms', () => {
    expect(Object.keys(STAGES)).toHaveLength(6);
    expect(STAGE_ORDER.map((stage) => STAGES[stage].ammo)).toEqual([6, 6, 5, 5, 4, 5]);
    expect(new Set(Object.values(STAGES).map((stage) => stage.theme)).size).toBe(6);
    expect(STAGE_ORDER.map((stage) => CHICK_FORMS[stage].formId)).toEqual(['baby', 'baby', 'breeze', 'breeze', 'fighter', 'golden']);
  });

  it('increases the block puzzle in the opening and final combo stages without reducing the existing ammo curve', () => {
    const blockCounts = STAGE_ORDER.map((stage) => STAGES[stage].spawns.filter((spawn) => spawn.kind === 'block').length);
    expect(blockCounts).toEqual([12, 14, 18, 10, 23, 28]);
    expect(blockCounts[1]).toBeGreaterThan(blockCounts[0]);
    expect(blockCounts[2]).toBeGreaterThan(blockCounts[1]);
    expect(blockCounts[4]).toBeGreaterThan(blockCounts[2]);
    expect(blockCounts[5]).toBeGreaterThan(blockCounts[4]);
    expect(STAGE_ORDER.map((stage) => STAGES[stage].ammo)).toEqual([6, 6, 5, 5, 4, 5]);
  });

  it('uses a rising staircase, higher upper structure, and both new materials in later stages', () => {
    const stairs = STAGES[3].spawns.filter((spawn) => spawn.kind === 'block' && [580, 645, 710].includes(spawn.x));
    expect(stairs.filter((spawn) => spawn.w === 24).map((spawn) => spawn.y)).toEqual([620, 570, 520]);
    expect(stairs.filter((spawn) => spawn.h === 24).map((spawn) => spawn.y)).toEqual([558, 458, 358]);
    const highestStageSixBlock = Math.min(...STAGES[6].spawns.filter((spawn) => spawn.kind === 'block').map((spawn) => spawn.y - (spawn.h ?? 0) / 2));
    expect(highestStageSixBlock).toBe(212);
    for (const stage of [3, 4, 5, 6] as const) {
      const materials = STAGES[stage].spawns.filter((spawn) => spawn.kind === 'block').map((spawn) => spawn.material);
      expect(materials).toContain('steel');
      expect(materials).toContain('rubber');
    }
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
      expect(stage.story.instruction.length).toBeGreaterThan(0);
      expect(stage.spawns.length).toBeGreaterThan(0);
      for (const spawn of stage.spawns) {
        expect(Number.isFinite(spawn.x)).toBe(true);
        expect(Number.isFinite(spawn.y)).toBe(true);
      }
    }
  });

  it.each([
    [1, 'block'], [2, 'cat'], [3, 'fan'], [4, 'shutter'], [5, 'tnt'], [6, 'boss'],
  ] as const)('teaches the primary mechanic in stage %s', (stageNumber, mechanic) => {
    const spawns = STAGES[stageNumber].spawns;
    expect(spawns.some((spawn) => {
      if (mechanic === 'block') return spawn.kind === 'block';
      if (mechanic === 'cat') return spawn.kind === 'cat' && (spawn.shieldLayers ?? 0) > 0;
      if (mechanic === 'tnt') return spawn.kind === 'block' && spawn.material === 'tnt';
      if (mechanic === 'boss') return spawn.kind === 'cat' && spawn.boss;
      return spawn.kind === mechanic;
    })).toBe(true);
  });

  it('keeps the fan and shutter as separate lessons and reserves secondary hazards for later stages', () => {
    expect(STAGES[3].spawns.some((spawn) => spawn.kind === 'fan')).toBe(true);
    expect(STAGES[3].spawns.some((spawn) => spawn.kind === 'shutter')).toBe(false);
    expect(STAGES[4].spawns.some((spawn) => spawn.kind === 'shutter')).toBe(true);
    expect(STAGES[4].spawns.some((spawn) => spawn.kind === 'tire')).toBe(true);
    expect(STAGES[2].spawns.some((spawn) => spawn.kind === 'tire')).toBe(false);
  });
});
