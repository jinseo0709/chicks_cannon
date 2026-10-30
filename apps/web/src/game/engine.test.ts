import { afterEach, describe, expect, it, vi } from 'vitest';
import { Body, Bodies, Composite, Events, Sleeping } from 'matter-js';
import { ChickCannonEngine } from './engine';
import { STAGES } from './stages';
import { CHICK_FORMS, STAGE_ORDER } from './constants';
import type { GameSnapshot, GameStage, GameState, SpawnSpec } from './types';

type TestBody = Matter.Body & { customData?: { projectile?: 'shell'|'feather'; hp?: number; alive?: boolean; triggered?: boolean; spent?: boolean; stageFrozen?: boolean } };
interface CampaignHarness {
  state: GameState;
  winElapsedMs: number;
  stage: GameStage;
  score: number;
  stageScore: number;
  ammo: number;
  items: Record<string, number>;
  stageEntryItems: Record<string, number>;
  eggCushionActive: boolean;
  finalRewardClaimed: boolean;
  replayOnly: boolean;
  bonusChallengeElapsedMs: number;
  bossHp: number;
  engine: Matter.Engine;
  bodies: Map<number, TestBody>;
  activeChick: TestBody | null;
  loadStage(stage: GameStage): void;
  awardScore(value: number, x: number, y: number, label?: string): void;
  applyStagePenalty(value: number, x: number, y: number, label: string): void;
  damageBody(body: TestBody, amount: number, context: { source: 'chick'; point: { x: number; y: number }; direction: { x: number; y: number }; frontal: boolean }): void;
  calculateStageStars(): 1 | 2 | 3;
  completeStage(): void;
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
  it('opens the clear popup immediately when the last enemy is gone', () => {
    const { engine, harness, snapshot } = createEngine(5);
    Composite.clear(harness.engine.world, false, true);
    harness.bodies.clear();
    harness.state = 'AIMING';

    engine.step(16.667);
    expect(snapshot()).toMatchObject({ stage: 5, state: 'EVOLUTION' });
  });

  it('recovers a non-final clear that enters WON instead of remaining stuck', () => {
    const { engine, harness, snapshot } = createEngine(5);
    harness.state = 'WON';

    engine.step(16.667);

    expect(snapshot()).toMatchObject({ stage: 5, state: 'EVOLUTION', items: { cushion: 1 } });
  });

  it('keeps the post-clear action popup when replaying a completed region', () => {
    const { engine, harness, snapshot } = createEngine(5);
    harness.replayOnly = true;
    harness.completeStage();
    harness.publish();

    expect(snapshot()).toMatchObject({ stage: 5, state: 'EVOLUTION' });
  });

  it('clears as soon as the last cat is defeated even if the chick never settles', () => {
    const { engine, harness, snapshot } = createEngine();
    Composite.clear(harness.engine.world, false, true);
    harness.bodies.clear();
    harness.spawn({ kind: 'cat', x: 900, y: 350 });
    const cat = [...harness.bodies.values()][0];
    engine.dismissDialogue();
    engine.setAim({ x: 35, y: 525 });
    engine.releaseAim();
    Body.setVelocity(harness.activeChick!, { x: 18, y: -2 });
    harness.damageBody(cat, 100, {
      source: 'chick', point: { ...cat.position }, direction: { x: 1, y: 0 }, frontal: true,
    });

    engine.step(16.667);

    expect(Math.hypot(harness.activeChick!.velocity.x, harness.activeChick!.velocity.y)).toBeGreaterThan(0.65);
    expect(snapshot().state).toBe('EVOLUTION');
  });

  it.each(STAGE_ORDER)('keeps unhit structures and the golden egg fixed at level %s start', (stage) => {
    const { engine, harness } = createEngine(stage);
    engine.dismissDialogue();
    const structures = [...harness.bodies.values()].filter((body) => body.customData?.stageFrozen);
    const startingPositions = structures.map(({ position }) => ({ x: position.x, y: position.y }));
    expect(structures.length).toBeGreaterThan(0);

    for (let frame = 0; frame < 120; frame += 1) engine.step(16.667);

    expect(structures.every((body) => body.isStatic)).toBe(true);
    expect(structures.map(({ position }) => ({ x: position.x, y: position.y }))).toEqual(startingPositions);
  });

  it('releases the frozen level structure when the chick first hits an obstacle', () => {
    const { engine, harness } = createEngine();
    engine.dismissDialogue();
    const block = [...harness.bodies.values()].find((body) => body.label === 'block' && body.customData?.stageFrozen)!;
    const chick = Bodies.circle(block.position.x - 40, block.position.y, 14, { label: 'chick' }) as TestBody;
    Composite.add(harness.engine.world, chick);

    Events.trigger(harness.engine, 'collisionStart', {
      pairs: [{ bodyA: block, bodyB: chick, collision: { normal: { x: 1, y: 0 }, supports: [] } }],
    });

    expect(block.customData?.stageFrozen).toBe(false);
    expect(block.isStatic).toBe(false);
  });

  it('keeps the stage setup still after retry until its dialogue is dismissed', () => {
    const { engine, harness, snapshot } = createEngine();
    engine.retryStage();
    const initial = [...harness.bodies.entries()].map(([id, body]) => ({
      id,
      x: body.position.x,
      y: body.position.y,
    }));
    const eggCount = initial.filter(({ id }) => harness.bodies.get(id)?.label === 'hostageEgg').length;

    for (let frame = 0; frame < 180; frame += 1) engine.step(16.667);

    expect(snapshot().state).toBe('DIALOGUE');
    expect(snapshot().defeatCause).toBeNull();
    expect(eggCount).toBeGreaterThan(0);
    for (const body of initial) {
      expect(harness.bodies.get(body.id)?.position.x).toBeCloseTo(body.x);
      expect(harness.bodies.get(body.id)?.position.y).toBeCloseTo(body.y);
    }
  });

  it('pushes a chick upward when it crosses a fan field', () => {
    const { engine, harness } = createEngine();
    engine.dismissDialogue();
    harness.engine.gravity.y = 0;
    harness.spawn({ kind: 'fan', x: 200, y: 200, w: 240, h: 300, forceX: 0.004, forceY: -0.04 });
    const chick = Bodies.circle(200, 200, 18, { density: 0.003, label: 'chick' }) as TestBody;
    const obstacle = Bodies.rectangle(320, 200, 30, 30, { density: 0.003, label: 'block' }) as TestBody;
    Composite.add(harness.engine.world, chick);
    Composite.add(harness.engine.world, obstacle);

    for (let frame = 0; frame < 8; frame += 1) engine.step(16.667);

    expect(chick.velocity.y).toBeLessThan(-0.1);
    expect(chick.velocity.x).toBeGreaterThan(0);
    expect(obstacle.velocity).toEqual({ x: 0, y: 0 });
  });

  it('opens a trapdoor once on a strong impact, rotates it to the hinge stop, and resets it on retry', () => {
    const { engine, harness } = createEngine(3);
    engine.dismissDialogue();
    harness.spawn({ kind: 'trapdoor', x: 300, y: 300, w: 120, h: 16, anchor: { x: 240, y: 300 }, triggerImpact: 5 });
    const trapdoor = [...harness.bodies.values()].find((body) => body.label === 'trapdoor')!;
    const striker = Bodies.rectangle(trapdoor.position.x, trapdoor.position.y - 18, 20, 20, { density: 0.003, label: 'block' }) as TestBody;
    Body.setVelocity(striker, { x: 0, y: 8 });
    Composite.add(harness.engine.world, striker);

    Events.trigger(harness.engine, 'collisionStart', {
      pairs: [{ bodyA: trapdoor, bodyB: striker, collision: { normal: { x: 0, y: 1 }, supports: [] } }],
    });
    expect(trapdoor.customData?.triggered).toBe(true);
    expect(trapdoor.isStatic).toBe(false);
    for (let frame = 0; frame < 90; frame += 1) engine.step(16.667);
    expect(trapdoor.angle).toBeGreaterThan(0.2);
    expect(trapdoor.angle).toBeLessThanOrEqual(85 * Math.PI / 180 + 0.01);

    engine.retryStage();
    const resetDoor = [...harness.bodies.values()].find((body) => body.label === 'trapdoor')!;
    expect(resetDoor.id).not.toBe(trapdoor.id);
    expect(resetDoor.isStatic).toBe(true);
    expect(resetDoor.customData?.triggered).toBe(false);
  });

  it('rotates clock hands clockwise and counterclockwise around their authored pivots', () => {
    const { engine, harness, snapshot } = createEngine();
    engine.dismissDialogue();
    harness.engine.gravity.y = 0;
    harness.spawn({ kind: 'clockHand', x: 300, y: 200, w: 120, h: 16, anchor: { x: 250, y: 200 }, angularSpeed: 0.5 });
    harness.spawn({ kind: 'clockHand', x: 300, y: 400, w: 120, h: 16, anchor: { x: 250, y: 400 }, angularSpeed: -0.5 });
    const hands = [...harness.bodies.values()].filter((body) => body.label === 'clockHand');
    const firstPositions = hands.map((body) => ({ ...body.position }));
    for (let frame = 0; frame < 60; frame += 1) engine.step(16.667);
    expect(hands[0].angle).toBeGreaterThan(0.45);
    expect(hands[1].angle).toBeLessThan(-0.45);
    expect(hands[0].position.y).toBeGreaterThan(firstPositions[0].y);
    expect(hands[1].position.y).toBeLessThan(firstPositions[1].y);
    expect(snapshot().entities.filter((entity) => entity.kind === 'clockHand')).toHaveLength(2);
  });

  it('moves only top-contact bodies along a conveyor and clamps their horizontal speed', () => {
    const { engine, harness } = createEngine();
    engine.dismissDialogue();
    harness.engine.gravity.y = 0;
    harness.spawn({ kind: 'conveyor', x: 300, y: 400, w: 200, h: 20, forceX: 8 });
    const topBody = Bodies.rectangle(300, 385, 20, 18, { density: 0.003, label: 'block' }) as TestBody;
    const sideBody = Bodies.rectangle(410, 400, 20, 20, { density: 0.003, label: 'block' }) as TestBody;
    Composite.add(harness.engine.world, [topBody, sideBody]);
    for (let frame = 0; frame < 10; frame += 1) engine.step(16.667);
    expect(topBody.velocity.x).toBeGreaterThan(0);
    expect(sideBody.velocity.x).toBeCloseTo(0);
    Body.setVelocity(topBody, { x: 30, y: topBody.velocity.y });
    engine.step(16.667);
    expect(topBody.velocity.x).toBeLessThanOrEqual(12);
  });

  it('launches from flower tops once per contact and permits a new launch after separation', () => {
    const { engine, harness } = createEngine();
    engine.dismissDialogue();
    const launcherSpec = { kind: 'flowerLauncher', x: 300, y: 400, radius: 35, forceY: 9 } as const;
    harness.spawn(launcherSpec);
    const launcher = [...harness.bodies.values()].find((body) => body.label === 'flowerLauncher')!;
    const chick = Bodies.circle(300, 360, 10, { label: 'chick' }) as TestBody;
    Body.setVelocity(chick, { x: 0, y: 5 });
    Composite.add(harness.engine.world, chick);
    const contact = () => Events.trigger(harness.engine, 'collisionStart', {
      pairs: [{ bodyA: launcher, bodyB: chick, collision: { normal: { x: 0, y: 1 }, supports: [] } }],
    });
    contact();
    expect(chick.velocity.y).toBe(-9);
    expect(chick.customData?.spent).toBe(true);
    Body.setVelocity(chick, { x: 0, y: 5 });
    contact();
    expect(chick.velocity.y).toBe(5);

    Body.setPosition(chick, { x: 500, y: 360 });
    engine.step(16.667);
    expect(chick.customData?.spent).toBe(false);
    Body.setPosition(chick, { x: 300, y: 360 });
    Body.setVelocity(chick, { x: 0, y: 5 });
    contact();
    expect(chick.velocity.y).toBe(-9);
  });

  it('does not launch from a flower side and keeps gimmick snapshots serializable', () => {
    const { harness, snapshot } = createEngine();
    harness.spawn({ kind: 'flowerLauncher', x: 300, y: 400, radius: 35 });
    const launcher = [...harness.bodies.values()].find((body) => body.label === 'flowerLauncher')!;
    const sideBody = Bodies.circle(330, 400, 10, { label: 'chick' }) as TestBody;
    Body.setVelocity(sideBody, { x: 0, y: 5 });
    Composite.add(harness.engine.world, sideBody);
    Events.trigger(harness.engine, 'collisionStart', {
      pairs: [{ bodyA: launcher, bodyB: sideBody, collision: { normal: { x: 1, y: 0 }, supports: [] } }],
    });
    expect(sideBody.velocity.y).toBe(5);
    expect(sideBody.customData?.spent).toBeUndefined();
    expect(() => JSON.stringify(snapshot())).not.toThrow();
  });

  it('uses finite default dimensions and strengths for invalid optional gimmick values', () => {
    const { harness } = createEngine();
    harness.spawn({ kind: 'trapdoor', x: 300, y: 300, w: Number.NaN, h: -1, triggerImpact: Number.NaN });
    harness.spawn({ kind: 'clockHand', x: 500, y: 300, w: 100, h: 10, angularSpeed: Number.NaN });
    harness.spawn({ kind: 'conveyor', x: 700, y: 300, w: 100, h: 10, forceX: Number.NaN });
    harness.spawn({ kind: 'flowerLauncher', x: 900, y: 300, radius: Number.NaN, forceY: Number.NaN });
    for (const body of harness.bodies.values()) {
      expect(Number.isFinite(body.position.x)).toBe(true);
      expect(Number.isFinite(body.position.y)).toBe(true);
      expect(Number.isFinite(body.angle)).toBe(true);
      expect(body.bounds.max.x).toBeGreaterThan(body.bounds.min.x);
      expect(body.bounds.max.y).toBeGreaterThan(body.bounds.min.y);
    }
  });

  it('starts the optional bonus timer after dialogue and pauses it with the game', () => {
    const { engine, snapshot } = createEngine();
    expect(snapshot().bonusChallengeStatus).toBe('ready');
    engine.dismissDialogue();
    expect(snapshot().bonusChallengeStatus).toBe('running');
    const remaining = snapshot().bonusChallengeRemainingMs;
    engine.step(33.333);
    const afterTick = snapshot().bonusChallengeRemainingMs;
    expect(afterTick).toBeLessThan(remaining);
    engine.pause();
    engine.step(33.333);
    expect(snapshot().bonusChallengeRemainingMs).toBe(afterTick);
  });

  it('fails the stage when the time limit expires', () => {
    const { engine, harness, snapshot } = createEngine();
    engine.dismissDialogue();
    harness.bonusChallengeElapsedMs = STAGES[1].bonusChallenge.timeLimitMs - 20;
    engine.step(33.333);
    expect(snapshot()).toMatchObject({ state: 'LOST', defeatCause: 'timer', bonusChallengeStatus: 'expired' });
  });

  it('fails stages four through six when the egg breaks, unless its cushion absorbs the break', () => {
    const { harness, snapshot } = createEngine(4);
    harness.spawn({ kind: 'egg', x: 1180, y: 620 });
    const egg = [...harness.bodies.values()].find((body) => body.label === 'hostageEgg')!;
    harness.damageBody(egg, 20, { source: 'chick', point: egg.position, direction: { x: 1, y: 0 }, frontal: false });
    harness.publish();
    expect(snapshot()).toMatchObject({ state: 'LOST', defeatCause: 'hostage' });

    harness.loadStage(5);
    harness.eggCushionActive = true;
    harness.spawn({ kind: 'egg', x: 1180, y: 620 });
    harness.publish();
    const protectedEgg = [...harness.bodies.values()].find((body) => body.label === 'hostageEgg')!;
    harness.damageBody(protectedEgg, 20, { source: 'chick', point: protectedEgg.position, direction: { x: 1, y: 0 }, frontal: false });
    harness.publish();
    expect(snapshot()).toMatchObject({ state: 'DIALOGUE', defeatCause: null, eggCushionActive: false });
    expect(harness.bodies.has(protectedEgg.id)).toBe(true);
  });

  it('keeps early stages playable when the egg breaks and deducts stage points', () => {
    const { harness, snapshot } = createEngine(3);
    harness.spawn({ kind: 'egg', x: 1180, y: 620 });
    harness.awardScore(1000, 1180, 620);
    const egg = [...harness.bodies.values()].find((body) => body.label === 'hostageEgg')!;
    harness.damageBody(egg, 20, { source: 'chick', point: egg.position, direction: { x: 1, y: 0 }, frontal: false });
    harness.publish();
    expect(snapshot()).toMatchObject({ state: 'DIALOGUE', defeatCause: null, stageScore: 500 });
  });

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

  it('drops a cat when the chick destroys the block supporting it', () => {
    const { engine, harness } = createEngine();
    engine.dismissDialogue();
    Composite.clear(harness.engine.world, false, true);
    harness.bodies.clear();
    harness.engine.gravity.y = 1.05;
    harness.spawn({ kind: 'cat', x: 900, y: 290, radius: 22 });
    const cat = [...harness.bodies.values()][0];
    harness.spawn({ kind: 'block', material: 'wood', x: 900, y: 312, w: 100, h: 20 });
    const obstacle = [...harness.bodies.values()][1];
    obstacle.customData!.hp = 1;
    Sleeping.set(cat, true);
    expect(cat.isSleeping).toBe(true);
    const chick = Bodies.circle(820, 312, 12, { label: 'chick' }) as TestBody;
    Body.setVelocity(chick, { x: 10, y: 0 });
    Composite.add(harness.engine.world, chick);
    const startY = cat.position.y;
    Events.trigger(harness.engine, 'collisionStart', { pairs: [{ bodyA: chick, bodyB: obstacle, collision: { supports: [] } }] });
    expect(obstacle.customData?.alive).toBe(false);
    expect(harness.bodies.has(obstacle.id)).toBe(false);
    expect(cat.isStatic).toBe(false);
    expect(cat.isSleeping).toBe(false);
    expect(cat.velocity.y).toBeGreaterThan(0);
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
    const target = [...harness.bodies.values()].find((body) => body.label === 'enemy')!;
    Body.setPosition(bird, { x: target.position.x - 180, y: target.position.y });
    const form = CHICK_FORMS[stage];
    expect(bird.velocity.x).toBeCloseTo(form.launchPower * 1.2);
    expect(bird.density).toBeCloseTo(form.density);
    engine.activateSkill();
    const auxiliaries = snapshot().entities.filter((entity) => entity.projectile);
    if (form.skillKind === 'shell') expect(auxiliaries).toHaveLength(3);
    else if (form.skillKind === 'feathers') expect(auxiliaries).toHaveLength(7);
    else if (form.skillKind === 'boost') expect(bird.velocity.x).toBeCloseTo(form.launchPower * 1.2 * 1.6);
    else expect(bird.velocity.y).toBeCloseTo(28);
    const count = snapshot().entities.length;
    engine.activateSkill();
    expect(snapshot().entities).toHaveLength(count);
  });

  it('requires a nearby cat before a flight skill can activate', () => {
    const { engine, harness, snapshot } = createEngine(1);
    engine.dismissDialogue();
    engine.setAim({ x: 35, y: 525 });
    engine.releaseAim();
    const bird = harness.activeChick!;
    const target = [...harness.bodies.values()].find((body) => body.label === 'enemy')!;

    engine.activateSkill();
    expect(snapshot().entities.filter((entity) => entity.projectile)).toHaveLength(0);
    expect(snapshot().skillCooldownRemainingMs).toBe(0);

    Body.setPosition(bird, { x: target.position.x - 180, y: target.position.y });
    engine.activateSkill();
    expect(snapshot().entities.filter((entity) => entity.projectile)).toHaveLength(3);
    expect(snapshot().skillCooldownRemainingMs).toBeGreaterThan(0);
  });

  it.each([1, 16] as const)('expires supplementary projectiles and clears them on retry in level %s', (stage) => {
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
    Body.setPosition(harness.activeChick!, { x: 900, y: 100 });
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
    expect(cat.customData?.hp).toBeCloseTo(1000 - 4 * 4.5 * CHICK_FORMS[stage].damageMultiplier);
  });

  it('progresses past the stage-6 mid-boss without ending the campaign', () => {
    const { engine, harness, snapshot } = createEngine();
    const rewards = ['mega', 'booster', 'quake', 'butter', 'cushion'] as const;
    for (const stage of STAGE_ORDER.slice(0, 6)) {
      expect(snapshot().stage).toBe(stage);
      expect(snapshot().campaignComplete).toBe(false);
      if (snapshot().state === 'DIALOGUE') engine.dismissDialogue();
      engine.setAim({ x: 35, y: 525 });
      engine.releaseAim();
      for (const body of harness.bodies.values()) {
        if (body.label === 'enemy') {
          Composite.remove(harness.engine.world, body);
          harness.bodies.delete(body.id);
        }
      }
      if (stage === 6) harness.bossHp = 0;
      engine.step(16.667);
      for (let frame = 0; frame < 54; frame += 1) engine.step(16.667);
      expect(snapshot().campaignComplete).toBe(false);
      expect(snapshot().state).toBe('EVOLUTION');
      if (stage <= 5) expect(snapshot().items[rewards[stage - 1]]).toBe(1);
      if (stage === 5) expect(snapshot().evolvedForm?.stage).toBe(stage + 1);
      engine.continueAfterEvolution();
      expect(snapshot()).toMatchObject({ stage: stage + 1, state: 'DIALOGUE' });
    }
    expect(snapshot()).toMatchObject({ stage: 7, state: 'DIALOGUE', campaignComplete: false });
    expect(engine.claimFinalReward('butter')).toBe(false);
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
    engine.setAim({ x: 130, y: 525 });
    engine.releaseAim();
    expect(snapshot().state).toBe('AIMING');
    expect(snapshot().ammo).toBe(6);

    engine.setAim({ x: 80, y: 500 });
    engine.releaseAim();
    const target = [...(engine as unknown as CampaignHarness).bodies.values()].find((body) => body.label === 'enemy')!;
    Body.setPosition((engine as unknown as CampaignHarness).activeChick!, { x: target.position.x - 180, y: target.position.y });
    const entitiesBeforeSkill = snapshot().entities.length;
    engine.activateSkill();
    const entitiesAfterSkill = snapshot().entities.length;
    engine.activateSkill();
    expect(entitiesAfterSkill - entitiesBeforeSkill).toBe(3);
    expect(snapshot().entities).toHaveLength(entitiesAfterSkill);
    engine.dispose();
  });

  it('enforces item state and quantity gates, and restarts the campaign cleanly', () => {
    const { engine, snapshot, harness } = createEngine();
    expect(snapshot().items).toEqual({ booster: 0, quake: 0, mega: 0, butter: 0, cushion: 0 });
    harness.items = { booster: 1, quake: 1, mega: 1, butter: 1, cushion: 1 };
    harness.publish();
    engine.useItem('booster');
    engine.useItem('mega');
    expect(snapshot().items).toEqual({ booster: 1, quake: 1, mega: 1, butter: 1, cushion: 1 });
    engine.dismissDialogue();
    engine.useItem('mega');
    expect(snapshot().items.mega).toBe(1);
    engine.useItem('mega');
    expect(snapshot().items.mega).toBe(1);
    engine.useItem('mega');
    engine.setAim({ x: 80, y: 500 });
    engine.releaseAim();
    expect(snapshot().items.mega).toBe(0);
    expect(engine.useItem('mega')).toBe(false);
    engine.restartCampaign();
    expect(snapshot().stage).toBe(1);
    expect(snapshot().state).toBe('DIALOGUE');
    expect(snapshot().score).toBe(0);
    expect(snapshot().items).toEqual({ booster: 0, quake: 0, mega: 0, butter: 0, cushion: 0 });
    engine.dispose();
  });

  it('restores stage-entry score, ammo and all item charges on retry', () => {
    const { engine, snapshot, harness } = createEngine();
    harness.score = 3400;
    harness.items = { booster: 1, quake: 2, mega: 0, butter: 1, cushion: 1 };
    engine.selectStage(2);
    harness.awardScore(1500, 850, 500, 'test');
    engine.dismissDialogue();
    engine.useItem('quake');
    engine.setAim({ x: 80, y: 500 });
    engine.releaseAim();
    engine.retryStage();
    expect(snapshot()).toMatchObject({ stage: 2, score: 3400, stageScore: 0, ammo: 6 });
    expect(snapshot().items).toEqual({ booster: 1, quake: 2, mega: 0, butter: 1, cushion: 1 });
    engine.dispose();
  });

  it('uses an egg cushion once to prevent the cracked egg score penalty', () => {
    const { engine, harness, snapshot } = createEngine();
    engine.dismissDialogue();
    harness.items.cushion = 1;
    harness.spawn({ kind: 'egg', x: 1180, y: 620 });
    const egg = [...harness.bodies.values()].find((body) => body.label === 'hostageEgg')!;
    expect(engine.useItem('cushion')).toBe(true);
    expect(snapshot().eggCushionActive).toBe(true);
    harness.damageBody(egg, 20, { source: 'chick', point: egg.position, direction: { x: 1, y: 0 }, frontal: false });
    harness.publish();
    expect(snapshot()).toMatchObject({ stageScore: 0, score: 0, eggCushionActive: false, items: { cushion: 0 } });
    expect(harness.bodies.has(egg.id)).toBe(false);
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
    const { engine, snapshot, onSnapshot, harness } = createEngine();
    harness.items.quake = 1;
    harness.publish();
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
