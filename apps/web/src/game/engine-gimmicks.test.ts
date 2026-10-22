import { afterEach, describe, expect, it } from 'vitest';
import { Bodies, Body, Composite, Events, type Engine, type IEventCollision } from 'matter-js';
import { ChickCannonEngine } from './engine';
import { STAGES } from './stages';
import { WORLD } from './constants';
import type { Point, SpawnSpec } from './types';

type FixtureBody = Matter.Body & {
  customData?: {
    hp?: number; maxHp?: number; alive?: boolean; destroyed?: boolean;
    attached?: boolean; shieldLayers?: number;
  };
};
interface Harness {
  engine: Engine;
  bodies: Map<number, FixtureBody>;
  chandelierConstraints: Map<number, Matter.Constraint>;
  pendingVelocities: Map<number, unknown>;
  spawn(spec: SpawnSpec): void;
  track(body: FixtureBody, data: NonNullable<FixtureBody['customData']>): void;
  publish(): void;
  damageBody(body: FixtureBody, amount: number, context: {
    source: 'block'; point: Point; direction: Point; frontal: boolean;
  }): void;
  explode(x: number, y: number, radius: number, forceMagnitude: number): void;
}

const engines: ChickCannonEngine[] = [];
afterEach(() => engines.splice(0).forEach((engine) => engine.dispose()));

function setup() {
  const game = new ChickCannonEngine(() => undefined);
  engines.push(game);
  const harness = game as unknown as Harness;
  Composite.clear(harness.engine.world, false, true);
  harness.bodies.clear();
  harness.engine.gravity.y = 0;
  game.dismissDialogue();
  const spawn = (spec: SpawnSpec): FixtureBody => {
    const before = new Set(harness.bodies.keys());
    harness.spawn(spec);
    return [...harness.bodies.values()].find((body) => !before.has(body.id))!;
  };
  const chick = (x: number, y: number, vx: number, vy: number): FixtureBody => {
    const body = Bodies.circle(x, y, 12, { label: 'chick', frictionAir: 0 }) as FixtureBody;
    harness.track(body, { hp: 1, maxHp: 1, alive: true });
    Body.setVelocity(body, { x: vx, y: vy });
    Composite.add(harness.engine.world, body);
    return body;
  };
  const collide = (a: FixtureBody, b: FixtureBody, name: 'collisionStart' | 'collisionActive' = 'collisionStart') => {
    Events.trigger(harness.engine, name, {
      pairs: [{ bodyA: a, bodyB: b, collision: { supports: [{ x: a.position.x, y: a.position.y }] } }],
    } as unknown as IEventCollision<Engine>);
    harness.publish();
  };
  return { game, harness, spawn, chick, collide };
}

describe('interactive obstacle physics', () => {
  it.each([
    { x: 300, y: 290, vx: 0, vy: 8, expectedX: 0, expectedY: -14.4 },
    { x: 260, y: 310, vx: 6, vy: 6, expectedX: -10.8, expectedY: -10.8 },
    { x: 300, y: 270, vx: 0, vy: 40, expectedX: 0, expectedY: -55 },
  ])('reflects an actual incoming tire collision once, with a speed cap ($vx, $vy)', (shot) => {
    const { game, spawn } = setup();
    spawn({ kind: 'tire', x: 300, y: 350, radius: 40 });
    const ball = spawn({ kind: 'boulder', x: shot.x, y: shot.y, radius: 12 });
    ball.frictionAir = 0;
    Body.setVelocity(ball, { x: shot.vx, y: shot.vy });
    for (let frame = 0; frame < 4 && ball.velocity.y >= 0; frame += 1) game.step(16.667);
    expect(ball.velocity.x).toBeCloseTo(shot.expectedX, 1);
    expect(ball.velocity.y).toBeCloseTo(shot.expectedY, 1);
    expect(Math.hypot(ball.velocity.x, ball.velocity.y)).toBeLessThanOrEqual(55.0001);
    expect(game.getSnapshot().entities.some((entity) => entity.kind === 'tire')).toBe(true);
  });

  it.each([0.025, -0.025])('pushes actual gear contacts in the rotation direction and freezes while paused (%s)', (angularSpeed) => {
    const { game, harness, spawn, collide } = setup();
    const gear = spawn({ kind: 'gear', x: 300, y: 350, radius: 40, angularSpeed });
    const ball = spawn({ kind: 'boulder', x: 349, y: 350, radius: 12 });
    ball.frictionAir = 0;
    game.step(16.667);
    expect(ball.velocity.y * Math.sign(angularSpeed)).toBeGreaterThan(2);
    expect(gear.angle).toBeCloseTo(angularSpeed, 5);
    expect(gear.position).toEqual({ x: 300, y: 350 });
    collide(gear, ball, 'collisionActive');
    expect(harness.pendingVelocities.size).toBe(0);
    const before = game.getSnapshot().entities;
    game.pause();
    game.step(33.333);
    expect(game.getSnapshot().entities).toEqual(before);
  });

  it('swings a constrained chandelier, drops it after a hard impact and restores its connection on retry', () => {
    const { game, harness, spawn, collide } = setup();
    const spec: SpawnSpec = { kind: 'chandelier', x: 400, y: 240, anchor: { x: 400, y: 100 } };
    const chandelier = spawn(spec);
    for (let frame = 0; frame < 12; frame += 1) game.step(16.667);
    expect(chandelier.position.x).toBeGreaterThan(401);
    expect(Composite.allConstraints(harness.engine.world)).toHaveLength(1);
    const hammer = spawn({ kind: 'boulder', x: 600, y: 240, radius: 12 });
    Body.setVelocity(hammer, { x: 1, y: 0 });
    collide(chandelier, hammer);
    expect(chandelier.customData?.attached).toBe(true);
    Body.setVelocity(hammer, { x: 20, y: 0 });
    collide(chandelier, hammer);
    collide(chandelier, hammer);
    expect(chandelier.customData?.attached).toBe(false);
    expect(Composite.allConstraints(harness.engine.world)).toHaveLength(0);
    harness.engine.gravity.y = 1.05;
    const previousY = chandelier.position.y;
    for (let frame = 0; frame < 30; frame += 1) game.step(16.667);
    expect(chandelier.position.y).toBeGreaterThan(previousY + 30);

    const originalSpawns = STAGES[1].spawns;
    try {
      Object.defineProperty(STAGES[1], 'spawns', { configurable: true, writable: true, value: [spec] });
      game.retryStage();
      expect(Composite.allConstraints(harness.engine.world)).toHaveLength(1);
      expect(harness.chandelierConstraints.size).toBe(1);
      expect(game.getSnapshot().entities.find((entity) => entity.kind === 'chandelier')?.attached).toBe(true);
    } finally {
      Object.defineProperty(STAGES[1], 'spawns', { configurable: true, writable: true, value: originalSpawns });
    }
    game.dispose();
    expect(Composite.allConstraints(harness.engine.world)).toHaveLength(0);
    expect(harness.chandelierConstraints.size).toBe(0);
  });

  it('consumes two shield layers on separate frontal shots and scores a defeat only once', () => {
    const { game, harness, spawn, chick, collide } = setup();
    const cat = spawn({ kind: 'cat', x: 300, y: 300, shieldLayers: 2 });
    const projectile = chick(270, 300, 8, 0);
    collide(cat, projectile);
    expect(cat.customData).toMatchObject({ shieldLayers: 1, hp: 28, alive: true });
    expect(projectile.velocity.x).toBeCloseTo(-5.6);
    Body.setVelocity(projectile, { x: 8, y: 0 });
    collide(cat, projectile);
    expect(cat.customData).toMatchObject({ shieldLayers: 0, hp: 28, alive: true });
    Body.setVelocity(projectile, { x: 8, y: 0 });
    collide(cat, projectile);
    collide(cat, projectile);
    expect(cat.customData?.alive).toBe(false);
    expect(game.getSnapshot().score).toBe(3000);
    expect(harness.bodies.has(cat.id)).toBe(false);
    expect(Composite.allBodies(harness.engine.world)).not.toContain(cat);
  });

  it('allows a rear shot and a falling block to bypass unspent shields', () => {
    const { game, spawn, chick, collide } = setup();
    const rearCat = spawn({ kind: 'cat', x: 300, y: 300, shieldLayers: 2 });
    const rearShot = chick(330, 300, -9, 0);
    collide(rearCat, rearShot);
    expect(rearCat.customData?.alive).toBe(false);
    const fallingCat = spawn({ kind: 'cat', x: 500, y: 300, shieldLayers: 2 });
    const fallingBlock = spawn({ kind: 'block', x: 500, y: 260, w: 30, h: 30, material: 'stone' });
    Body.setVelocity(fallingBlock, { x: 0, y: 9 });
    collide(fallingCat, fallingBlock);
    expect(fallingCat.customData?.alive).toBe(false);
    expect(game.getSnapshot().score).toBe(4000);
  });

  it('chains each TNT once and shares damage and single-defeat scoring across explosions', () => {
    const { game, harness, spawn } = setup();
    const charges = [300, 360, 420].map((x) => spawn({ kind: 'block', x, y: 300, w: 32, h: 32, material: 'tnt' }));
    const cat = spawn({ kind: 'cat', x: 480, y: 300 });
    const context = { source: 'block' as const, point: { x: 300, y: 300 }, direction: { x: 1, y: 0 }, frontal: false };
    harness.damageBody(charges[0], 100, context);
    harness.damageBody(charges[0], 100, context);
    harness.publish();
    expect(charges.every((charge) => charge.customData?.destroyed)).toBe(true);
    expect(cat.customData?.alive).toBe(false);
    expect(game.getSnapshot().score).toBe(3 * 600 + 1200);
    expect(harness.bodies.size).toBe(0);
  });

  it('treats an explosion-broken egg as a score penalty instead of a defeat', () => {
    const { game, harness, spawn } = setup();
    spawn({ kind: 'egg', x: 330, y: 300 });
    harness.explode(300, 300, 230, 0.14);
    game.step(16.667);
    expect(game.getSnapshot().state).not.toBe('LOST');
    expect(game.getSnapshot().entities.some((entity) => entity.kind === 'egg')).toBe(false);
    expect(game.getSnapshot().stageScore).toBe(100);
  });

  it('scores cats leaving the world once and sanitizes non-positive prop dimensions', () => {
    const { game, harness, spawn } = setup();
    const escaped = spawn({ kind: 'cat', x: WORLD.width + 180, y: 300 });
    const prop = spawn({ kind: 'chandelier', x: 200, y: 200, w: -10, h: 0, radius: -1 });
    game.step(16.667);
    game.step(16.667);
    expect(game.getSnapshot().score).toBe(1200);
    expect(harness.bodies.has(escaped.id)).toBe(false);
    expect(game.getSnapshot().entities.find((entity) => entity.id === prop.id)).toMatchObject({ width: 100, height: 36 });
  });
});
