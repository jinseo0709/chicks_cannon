import { describe, expect, it } from 'vitest';
import { CHICK_FORMS, REGIONS, STAGE_ORDER, STAGE_SCORE_TARGETS } from './constants';
import { ChickCannonEngine } from './engine';
import { STAGES } from './stages';
import type { GameStage } from './types';

function coarseLayoutSignature(stage: GameStage): string {
  const structuralSpawns = STAGES[stage].spawns.filter((spawn) => spawn.kind !== 'egg');
  const minX = Math.min(...structuralSpawns.map(({ x }) => x));
  const maxX = Math.max(...structuralSpawns.map(({ x }) => x));
  const minY = Math.min(...structuralSpawns.map(({ y }) => y));
  const maxY = Math.max(...structuralSpawns.map(({ y }) => y));
  const bucket = (value: number, min: number, max: number) => Math.min(3, Math.floor(((value - min) / Math.max(1, max - min)) * 4));

  return structuralSpawns.map((spawn) => [
    spawn.kind,
    spawn.material ?? '',
    bucket(spawn.x, minX, maxX),
    bucket(spawn.y, minY, maxY),
    Math.round((spawn.w ?? (spawn.radius ? spawn.radius * 2 : 0)) / 40),
    Math.round((spawn.h ?? (spawn.radius ? spawn.radius * 2 : 0)) / 40),
    spawn.shieldLayers ?? 0,
  ].join(':')).sort().join('|');
}

describe('campaign stage data', () => {
  it('contains twenty ordered stages grouped into four five-stage regions', () => {
    expect(Object.keys(STAGES)).toHaveLength(20);
    expect(STAGE_ORDER).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(Object.values(REGIONS).map(({ firstStage, lastStage }) => [firstStage, lastStage])).toEqual([[1, 5], [6, 10], [11, 15], [16, 20]]);
    expect(STAGE_ORDER.map((stage) => STAGES[stage].region)).toEqual([
      1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4,
    ]);
  });

  it('keeps chick forms fixed within each region and scales score targets to stage contents', () => {
    expect(STAGE_ORDER.map((stage) => CHICK_FORMS[stage].formId)).toEqual([
      'baby', 'baby', 'baby', 'baby', 'baby',
      'breeze', 'breeze', 'breeze', 'breeze', 'breeze',
      'fighter', 'fighter', 'fighter', 'fighter', 'fighter',
      'golden', 'golden', 'golden', 'golden', 'golden',
    ]);
    for (const stage of STAGE_ORDER) {
      const rewards = STAGES[stage].spawns.reduce((sum, spawn) => {
        if (spawn.kind === 'cat') return sum + (spawn.boss ? 3000 : spawn.shieldLayers ? 2000 : 1200);
        if (spawn.kind === 'block') return sum + (spawn.material === 'tnt' ? 600 : 180) * 0.25;
        return sum;
      }, STAGES[stage].bonusChallenge.bonusScore);
      expect(STAGE_SCORE_TARGETS[stage]).toBe(Math.ceil(rewards / 100) * 100);
    }
  });

  it('keeps the stage-6 mid-boss and reserves the final boss for stage 20', () => {
    expect(STAGES[6].bossRole).toBe('mid');
    expect(STAGES[6].spawns.some((spawn) => spawn.kind === 'cat' && spawn.boss)).toBe(true);
    expect(STAGES[20].bossRole).toBe('final');
    expect(STAGES[20].spawns.some((spawn) => spawn.kind === 'cat' && spawn.boss)).toBe(true);
    expect(STAGE_ORDER.filter((stage) => STAGES[stage].bossRole)).toEqual([6, 20]);
  });

  it('raises forts and adds more cats as each region approaches its finale', () => {
    const catCount = (stage: GameStage) => STAGES[stage].spawns.filter((spawn) => spawn.kind === 'cat').length;
    const fortTop = (stage: GameStage) => Math.min(...STAGES[stage].spawns
      .filter((spawn) => spawn.kind === 'block')
      .map((spawn) => spawn.y));

    for (const [start, finale] of [[1, 5], [6, 10], [11, 15], [16, 19]] as const) {
      expect(catCount(finale)).toBeGreaterThan(catCount(start));
      expect(fortTop(finale)).toBeLessThan(fortTop(start));
    }
    expect(catCount(20)).toBeGreaterThanOrEqual(5);
  });

  it.each([10, 15, 19] as const)('splits the stage %s finale targets across separate fort platforms', (stage) => {
    const platforms = STAGES[stage].spawns.filter((spawn) => spawn.kind === 'block' && spawn.h === 22 && spawn.y === 558);
    const centers = platforms.map((platform) => platform.x).sort((a, b) => a - b);
    expect(centers.length).toBeGreaterThanOrEqual(2);
    expect(centers[centers.length - 1]! - centers[0]!).toBeGreaterThan(140);
  });

  it('assigns the six reused backgrounds and each region signature gimmick', () => {
    const themes = STAGE_ORDER.map((stage) => STAGES[stage].theme);
    expect(themes.slice(0, 3)).toEqual(['alley-day', 'alley-day', 'alley-day']);
    expect(themes.slice(3, 5)).toEqual(['wall-afternoon', 'wall-afternoon']);
    expect(themes.slice(5, 8)).toEqual(['rooftop-sunset', 'rooftop-sunset', 'rooftop-sunset']);
    expect(themes.slice(8, 10)).toEqual(['clock-twilight', 'clock-twilight']);
    expect(themes.slice(10, 15).every((theme) => theme === 'factory-night')).toBe(true);
    expect(themes.slice(15).every((theme) => theme === 'meadow-gold')).toBe(true);
    const regionalGimmicks = [
      [1, 'trapdoor', [3, 5]], [2, 'clockHand', [8, 9, 10]],
      [3, 'conveyor', [11, 12, 13, 14, 15]], [4, 'flowerLauncher', [16, 17, 18, 19, 20]],
    ] as const;
    for (const [region, gimmick, stages] of regionalGimmicks) {
      expect(REGIONS[region].gimmick).toBe(gimmick);
      for (const stage of stages) expect(STAGES[stage].spawns.some((spawn) => spawn.kind === gimmick)).toBe(true);
    }
  });

  it('gives alley and wall stages five distinct coarse silhouettes', () => {
    const regionOneStages = [1, 2, 3, 4, 5] as const;
    expect(new Set(regionOneStages.map(coarseLayoutSignature)).size).toBe(regionOneStages.length);
    expect(STAGES[3].spawns.some((spawn) => spawn.kind === 'trapdoor')).toBe(true);
    expect(STAGES[4].spawns.some((spawn) => spawn.kind === 'boulder')).toBe(true);
    expect(STAGES[5].spawns.some((spawn) => spawn.kind === 'trapdoor')).toBe(true);
    expect(STAGES[5].spawns.some((spawn) => spawn.kind === 'shutter')).toBe(true);
  });

  it('contains complete authored story, routes, challenge, and in-bounds spawn data', () => {
    for (const stageNumber of STAGE_ORDER) {
      const stage = STAGES[stageNumber];
      expect(stage.stage).toBe(stageNumber);
      expect(stage.title.length).toBeGreaterThan(0);
      expect(stage.story.speaker.length).toBeGreaterThan(0);
      expect(stage.story.text.length).toBeGreaterThan(0);
      expect(stage.story.chickReply.length).toBeGreaterThan(0);
      expect(stage.story.instruction.length).toBeGreaterThan(0);
      expect(stage.bonusChallenge.timeLimitMs).toBeGreaterThan(0);
      expect(stage.bonusChallenge.bonusScore).toBeGreaterThan(0);
      expect(stage.bonusChallenge.badge.length).toBeGreaterThan(0);
      expect(stage.spawns.length).toBeGreaterThan(0);
      expect(stage.attackRoutes).toHaveLength(2);
      expect(new Set(stage.attackRoutes.map((route) => route.name)).size).toBe(2);
      for (const route of stage.attackRoutes) {
        expect(route.hint.length).toBeGreaterThan(0);
        expect(Number.isFinite(route.target.x)).toBe(true);
        expect(Number.isFinite(route.target.y)).toBe(true);
        expect(stage.spawns.some((spawn) => Math.hypot(spawn.x - route.target.x, spawn.y - route.target.y) < 80)).toBe(true);
      }
      for (const spawn of stage.spawns) {
        expect(Number.isFinite(spawn.x)).toBe(true);
        expect(Number.isFinite(spawn.y)).toBe(true);
        expect(spawn.x).toBeGreaterThanOrEqual(0);
        expect(spawn.x).toBeLessThanOrEqual(1280);
        expect(spawn.y).toBeGreaterThanOrEqual(0);
        expect(spawn.y).toBeLessThanOrEqual(720);
      }
    }
  });

  it.each(STAGE_ORDER)('keeps stage %s stable for two seconds before the first shot', (stage) => {
    const engine = new ChickCannonEngine(() => undefined);
    const harness = engine as unknown as { stage: GameStage; loadStage(stage: GameStage): void };
    try {
      harness.stage = stage;
      harness.loadStage(stage);
      engine.dismissDialogue();
      for (let frame = 0; frame < 120; frame += 1) engine.step(16.667);
      const snapshot = engine.getSnapshot();
      expect(snapshot.state).toBe('AIMING');
      expect(snapshot.score).toBe(0);
      expect(snapshot.scoreTarget).toBe(STAGE_SCORE_TARGETS[stage]);
      expect(snapshot.entities.filter((entity) => entity.kind === 'egg')).toHaveLength(STAGES[stage].spawns.filter((spec) => spec.kind === 'egg').length);
      expect(snapshot.entities.filter((entity) => entity.kind === 'chandelier').every((entity) => entity.attached)).toBe(true);
    } finally {
      engine.dispose();
    }
  });
});
