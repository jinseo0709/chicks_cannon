import { describe, expect, it } from 'vitest';
import { STAGES } from './stages';

describe('campaign stage data', () => {
  it('contains four chapters with the original ammunition counts', () => {
    expect(Object.keys(STAGES)).toHaveLength(4);
    expect([STAGES[1].ammo, STAGES[2].ammo, STAGES[3].ammo, STAGES[4].ammo]).toEqual([3, 3, 4, 4]);
  });

  it('keeps all required special objects and protected targets in the campaign', () => {
    const allSpawns = Object.values(STAGES).flatMap((stage) => stage.spawns);
    expect(allSpawns.some((spawn) => spawn.kind === 'fan')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'shutter')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'trampoline')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'boulder')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'egg')).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'cat' && spawn.shield)).toBe(true);
    expect(allSpawns.some((spawn) => spawn.kind === 'block' && spawn.material === 'tnt')).toBe(true);
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
