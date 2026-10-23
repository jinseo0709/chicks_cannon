import { afterEach, describe, expect, it, vi } from 'vitest';
import { Body, Bodies, Composite, Events } from 'matter-js';
import { ChickCannonEngine } from './engine';
import { STAGES } from './stages';
import { CHICK_FORMS, STAGE_ORDER } from './constants';
import type { GameSnapshot, GameStage, SpawnSpec } from './types';

type TestBody = Matter.Body & { customData?: { projectile?: 'shell'|'feather'; hp?: number; alive?: boolean } };
interface CampaignHarness {
  stage: GameStage;
  score: number;
  stageScore: number;
  ammo: number;
  items: Record<string, number>;
  replayOnly: boolean;
  engine: Matter.Engine;
  bodies: Map<number, TestBody>;
  activeChick: TestBody | null;
  loadStage(stage: GameStage): void;
  awardScore(value: number, x: number, y: number, label?: string): void;
  applyStagePenalty(value: number, x: number, y: number, label: string): void;
  calculateStageStars(): 1 | 2 | 3;
  spawn(spec: SpawnSpec): void;
  publish(): void;
}
const createdEngines: ChickCannonEngine[] = [];
afterEach(() => createdEngines.splice(0).forEach((engine) => engine.dispose()));

function createEngine(stage: GameStage = 1) {
  let current: GameSnapshot | undefined;
  const onSnapshot = vi.fn((snapshot: GameSnapshot) => {
    current = snapshot;
  });
  const engine = new ChickCannonEngine(onSnapshot);
  createdEngines.push(engine);
  const harness = engine as unknown as CampaignHarness;
  if (stage !== 1) {
    harness.stage = stage;
    harness.loadStage(stage);
    harness.publish();
  }
  const snapshot = () => current as GameSnapshot;
  return { engine, onSnapshot, snapshot, harness };
}

describe('ChickCannonEngine', () => {
  it.each(STAGE_ORDER)('keeps level %s cats fixed until the chick hits an obstacle', (stage) => {
    const { engine, harness, snapshot } = createEngine(stage);
    const cats = [...harness.bodies.values()].filter((body) => body.label === 'enemy');
    const startingPositions = cats.map(({ position }) => ({ x: position.x, y: position.y }));
    expect(cats.length).toBeGreaterThan(0);
    expect(cats.every((cat) => cat.isStatic)).toBe(true);
    engine.dismissDialogue();
    for (let frame = 0; frame < 120; frame += 1) engine.step(16.667);
    expect(cats.map(({ position }) => ({ x: position.x, y: position.y }))).toEqual(startingPositions);
    expect(snapshot().stageScore).toBe(0);
  });

  it('releases cats to fall when the chick hits a structure', () => {
    const { engine, harness } = createEngine();
    Composite.clear(harness.engine.world, false, true);
    harness.bodies.clear();
    harness.engine.gravity.y = 1.05;
    harness.spawn({ kind: 'cat', x: 900, y: 300 });
    const cat = [...harness.bodies.values()][0];
    harness.spawn({ kind: 'block', material: 'stone', x: 850, y: 300, w: 24, h: 20 });
    const obstacle = [...harness.bodies.values()][1];
    const chick = Bodies.circle(820, 300, 12, { label: 'chick' }) as TestBody;
    Composite.add(harness.engine.world, chick);
    const startY = cat.position.y;
    Events.trigger(harness.engine, 'collisionStart', { pairs: [{ bodyA: chick, bodyB: obstacle, collision: { supports: [] } }] });
    expect(cat.isStatic).toBe(false);
    for (let frame = 0; frame < 10; frame += 1) engine.step(16.667);
    expect(cat.position.y).toBeGreaterThan(startY);
  });

  it('gives steel and rubber blocks distinct mass, durability, and bounce', () => {
    const { harness } = createEngine();
    harness.engine.gravity.y = 0;
    harness.spawn({ kind: 'block', material: 'steel', x: 300, y: 300, w: 40, h: 30 });
    harness.spawn({ kind: 'block', material: 'rubber', x: 500, y: 300, w: 40, h: 30 });
    const [steel, rubber] = [...harness.bodies.values()].slice(-2);
    expect(steel.density).toBeCloseTo(0.012);
    expect(steel.restitution).toBeCloseTo(0.08);
    expect(steel.customData?.hp).toBe(150);
    expect(rubber.density).toBeCloseTo(0.0024);
    expect(rubber.restitution).toBeCloseTo(0.78);
    expect(rubber.customData?.hp).toBe(28);
  });

  it.each(STAGE_ORDER)('uses the form power and skill for level %s', (stage) => {
    const { engine, harness, snapshot } = createEngine(stage);
    engine.dismissDialogue();
    engine.setAim({ x: 35, y: 525 });
    engine.releaseAim();
    const bird = harness.activeChick!;
    const form = CHICK_FORMS[stage];
    expect(bird.velocity.x).toBeCloseTo(form.launchPower);
    expect(bird.density).toBeCloseTo(form.density);
    engine.activateSkill();
    const auxiliaries = snapshot().entities.filter((entity) => entity.projectile);
    if (form.skillKind === 'shell') expect(auxiliaries).toHaveLength(3);
    else if (form.skillKind === 'feathers') expect(auxiliaries).toHaveLength(7);
    else if (form.skillKind === 'boost') expect(bird.velocity.x).toBeCloseTo(form.launchPower * 1.6);
    else expect(bird.velocity.y).toBeCloseTo(28);
    const count = snapshot().entities.length;
    engine.activateSkill();
    expect(snapshot().entities).toHaveLength(count);
  });

  it.each([1, 6] as const)('expires supplementary projectiles and clears them on retry in level %s', (stage) => {
    const { engine, harness, snapshot } = createEngine(stage);
    Composite.clear(harness.engine.world, false, true);
    harness.bodies.clear();
    harness.engine.gravity.y = 0;
    harness.spawn({ kind: 'cat', x: 1000, y: 100, hp: 1000 });
    const cat = [...harness.bodies.values()][0];
    Body.setStatic(cat, true);
    engine.dismissDialogue();
    engine.setAim({ x: 35, y: 525 });
    engine.releaseAim();
    engine.activateSkill();
    const bird = harness.activeChick!;
    const children = [...harness.bodies.values()].filter((body) => body.customData?.projectile);
    expect(children.length).toBe(stage === 1 ? 3 : 7);
    expect(children.every((body) => body.collisionFilter.group === bird.collisionFilter.group && body.collisionFilter.group! < 0)).toBe(true);
    for (let frame = 0; frame < 200; frame += 1) engine.step(16.667);
    expect(snapshot().entities.some((entity) => entity.projectile)).toBe(false);
    expect(children.every((body) => !harness.bodies.has(body.id))).toBe(true);
    engine.retryStage();
    expect(snapshot().entities.some((entity) => entity.projectile)).toBe(false);
  });

  it.each(STAGE_ORDER)('uses form damage rather than the level number in level %s', (stage) => {
    const { engine, harness } = createEngine(stage);
    Composite.clear(harness.engine.world, false, true);
    harness.bodies.clear();
    harness.spawn({ kind: 'cat', x: 900, y: 350, hp: 1000 });
    const cat = [...harness.bodies.values()][0];
    engine.dismissDialogue();
    engine.setAim({ x: 35, y: 525 });
    engine.releaseAim();
    const bird = harness.activeChick!;
    Body.setPosition(bird, { x: 870, y: 350 });
    Body.setVelocity(bird, { x: 4, y: 0 });
    Events.trigger(harness.engine, 'collisionStart', { pairs: [{ bodyA: cat, bodyB: bird, collision: { supports: [] } }] });
    expect(cat.customData?.hp).toBeCloseTo(1000 - 4 * 3.5 * CHICK_FORMS[stage].damageMultiplier);
  });

  it('progresses through all six levels and opens the ending only after the last one', () => {
    const { engine, harness, snapshot } = createEngine();
    for (const stage of STAGE_ORDER) {
      expect(snapshot().stage).toBe(stage);
      expect(snapshot().campaignComplete).toBe(false);
      engine.dismissDialogue();
      engine.setAim({ x: 35, y: 525 });
      engine.releaseAim();
      for (const body of harness.bodies.values()) {
        if (body.label === 'enemy') {
          Composite.remove(harness.engine.world, body);
          harness.bodies.delete(body.id);
        }
      }
      Body.setPosition(harness.activeChick!, { x: 1600, y: 300 });
      Body.setVelocity(harness.activeChick!, { x: 0, y: 0 });
      for (let frame = 0; frame < 100; frame += 1) engine.step(16.667);
      expect(snapshot().state).toBe(stage === 6 ? 'ENDING' : 'EVOLUTION');
      expect(snapshot().campaignComplete).toBe(stage === 6);
      if (stage < 6) {
        expect(snapshot().evolvedForm?.stage).toBe(stage + 1);
        engine.continueAfterEvolution();
      }
    }
    engine.continueAfterEvolution();
    expect(snapshot().stage).toBe(6);
  });

  it('starts the campaign in dialogue and launches with clamped drag power', () => {
    const { engine, snapshot } = createEngine();
    expect(snapshot().state).toBe('DIALOGUE');
    expect(snapshot().ammo).toBe(STAGES[1].ammo);

    engine.dismissDialogue();
    engine.setAim({ x: -400, y: 525 });
    expect(snapshot().aimPosition).toEqual({ x: 35, y: 525 });
    engine.releaseAim();
    expect(snapshot().state).toBe('FLYING');
    expect(snapshot().ammo).toBe(5);
    expect(snapshot().entities.some((entity) => entity.kind === 'chick')).toBe(true);
    engine.dispose();
  });

  it('rejects a short launch and allows a skill only once per shot', () => {
    const { engine, snapshot } = createEngine();
    engine.dismissDialogue();
    engine.setAim({ x: 150, y: 525 });
    engine.releaseAim();
    expect(snapshot().state).toBe('AIMING');
    expect(snapshot().ammo).toBe(6);

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
    expect(snapshot().items).toEqual({ booster: 1, quake: 1, mega: 1, butter: 1 });
    engine.dismissDialogue();
    engine.useItem('mega');
    expect(snapshot().items.mega).toBe(0);
    engine.useItem('mega');
    expect(snapshot().items.mega).toBe(0);
    engine.restartCampaign();
    expect(snapshot().stage).toBe(1);
    expect(snapshot().state).toBe('DIALOGUE');
    expect(snapshot().score).toBe(0);
    expect(snapshot().items).toEqual({ booster: 1, quake: 1, mega: 1, butter: 1 });
    engine.dispose();
  });

  it('restores stage-entry score, ammo and all item charges on retry', () => {
    const { engine, snapshot, harness } = createEngine();
    harness.score = 3400;
    engine.selectStage(2);
    harness.awardScore(1500, 850, 500, 'test');
    engine.dismissDialogue();
    engine.useItem('quake');
    engine.setAim({ x: 80, y: 500 });
    engine.releaseAim();
    engine.retryStage();
    expect(snapshot()).toMatchObject({ stage: 2, score: 3400, stageScore: 0, ammo: 6 });
    expect(snapshot().items).toEqual({ booster: 1, quake: 1, mega: 1, butter: 1 });
    engine.dispose();
  });

  it('applies an egg penalty once and floors stage score at zero without campaign failure', () => {
    const { engine, harness, snapshot } = createEngine();
    harness.spawn({ kind: 'egg', x: 1180, y: 620 });
    const egg = [...harness.bodies.values()].find((body) => body.label === 'hostageEgg')!;
    harness.awardScore(300, egg.position.x, egg.position.y);
    harness.applyStagePenalty(500, egg.position.x, egg.position.y, 'egg');
    harness.publish();
    expect(snapshot()).toMatchObject({ score: 0, stageScore: 0 });
    harness.awardScore(1000, egg.position.x, egg.position.y);
    harness.applyStagePenalty(500, egg.position.x, egg.position.y, 'egg');
    harness.publish();
    expect(snapshot()).toMatchObject({ score: 500, stageScore: 500 });
    expect(snapshot().state).not.toBe('LOST');
    engine.dispose();
  });

  it('calculates one, two and three star thresholds using stage-local score and ammo', () => {
    const { harness, snapshot } = createEngine();
    harness.stage = 1;
    harness.ammo = 3;
    harness.stageScore = snapshot().scoreTarget - 1;
    expect(harness.calculateStageStars()).toBe(2);
    harness.stageScore = snapshot().scoreTarget;
    expect(harness.calculateStageStars()).toBe(3);
    harness.ammo = 1;
    expect(harness.calculateStageStars()).toBe(2);
    harness.ammo = 0;
    expect(harness.calculateStageStars()).toBe(1);
    harness.stage = 5;
    harness.ammo = 3;
    harness.stageScore = 10000;
    expect(harness.calculateStageStars()).toBe(3);
  });

  it('excludes completed-stage replay points from the campaign total', () => {
    const { engine, harness, snapshot } = createEngine();
    harness.score = 2500;
    engine.selectStage(1, true);
    harness.awardScore(1200, 800, 500, 'replay');
    harness.publish();
    expect(snapshot()).toMatchObject({ score: 2500, stageScore: 1200 });
    expect(harness.replayOnly).toBe(true);
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
