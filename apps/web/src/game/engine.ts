import {
  Body,
  Bodies,
  Composite,
  Engine,
  Events,
  type IEventCollision,
} from 'matter-js';
import { BLOCK_CONFIG, CHICK_FORMS, WORLD } from './constants';
import { STAGES } from './stages';
import type {
  BlockKind,
  GameEntityView,
  GameSnapshot,
  GameStage,
  GameState,
  ItemCounts,
  ItemKind,
  Point,
  SpawnSpec,
} from './types';

type GameBody = Matter.Body & {
  customData?: {
    hp?: number;
    maxHp?: number;
    alive?: boolean;
    destroyed?: boolean;
    material?: BlockKind;
    width?: number;
    height?: number;
    boss?: boolean;
    shield?: boolean;
    minY?: number;
    maxY?: number;
    speed?: number;
    direction?: number;
    radius?: number;
  };
};

interface FanField {
  x: number;
  y: number;
  width: number;
  height: number;
  forceX: number;
  forceY: number;
}

const initialItems = (): Record<ItemKind, number> => ({ booster: 1, quake: 1, mega: 1 });
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export class ChickCannonEngine {
  private readonly engine = Engine.create();
  private readonly collisionListener: (event: IEventCollision<Matter.Engine>) => void;
  private readonly bodies = new Map<number, GameBody>();
  private fans: FanField[] = [];
  private state: GameState = 'DIALOGUE';
  private stateBeforePause: 'AIMING' | 'FLYING' | 'RESOLVING' | null = null;
  private stage: GameStage = 1;
  private score = 0;
  private ammo = STAGES[1].ammo;
  private items = initialItems();
  private muted = false;
  private aimPosition: Point | null = null;
  private activeChick: GameBody | null = null;
  private skillUsed = false;
  private megaNext = false;
  private settleFrames = 0;
  private winFrames = 0;
  private defeatCause: 'ammo' | 'hostage' | null = null;
  private alive = true;
  private snapshot: GameSnapshot;

  constructor(private readonly onSnapshot: (snapshot: GameSnapshot) => void) {
    this.engine.gravity.y = WORLD.gravityY;
    this.engine.gravity.x = 0;
    this.collisionListener = (event) => this.handleCollisions(event);
    Events.on(this.engine, 'collisionStart', this.collisionListener);
    this.loadStage(1);
    this.snapshot = this.createSnapshot();
    this.publish();
  }

  startCampaign(): void {
    this.stage = 1;
    this.score = 0;
    this.items = initialItems();
    this.megaNext = false;
    this.loadStage(1);
    this.publish();
  }

  dismissDialogue(): void {
    if (this.state !== 'DIALOGUE') return;
    this.state = 'AIMING';
    this.publish();
  }

  setAim(position: Point): void {
    if (!this.alive || this.state !== 'AIMING') return;
    const dx = position.x - WORLD.cannon.x;
    const dy = position.y - WORLD.cannon.y;
    const distance = Math.hypot(dx, dy);
    const ratio = distance > WORLD.maxDrag ? WORLD.maxDrag / distance : 1;
    this.aimPosition = { x: WORLD.cannon.x + dx * ratio, y: WORLD.cannon.y + dy * ratio };
    this.publish();
  }

  releaseAim(): void {
    if (!this.alive || this.state !== 'AIMING' || this.ammo <= 0 || !this.aimPosition) return;
    const dx = WORLD.cannon.x - this.aimPosition.x;
    const dy = WORLD.cannon.y - this.aimPosition.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 15) {
      this.aimPosition = null;
      this.publish();
      return;
    }

    const form = CHICK_FORMS[this.stage];
    const radius = form.radius * (this.megaNext ? 1.8 : 1);
    const density = form.density * (this.megaNext ? 3.5 : 1);
    const chick = Bodies.circle(WORLD.cannon.x, WORLD.cannon.y, radius, {
      density,
      restitution: 0.35,
      friction: 0.5,
      label: 'chick',
    }) as GameBody;
    this.track(chick, { radius, hp: 1, maxHp: 1, alive: true });
    const power = (Math.min(distance, WORLD.maxDrag) / WORLD.maxDrag) *
      (this.stage === 4 ? 31 : this.stage === 3 ? 28 : 26);
    const angle = Math.atan2(dy, dx);
    Body.setVelocity(chick, { x: Math.cos(angle) * power, y: Math.sin(angle) * power });
    Composite.add(this.engine.world, chick);
    this.activeChick = chick;
    this.skillUsed = false;
    this.megaNext = false;
    this.ammo -= 1;
    this.state = 'FLYING';
    this.aimPosition = null;
    this.settleFrames = 0;
    this.publish();
  }

  activateSkill(): void {
    const chick = this.activeChick;
    if (!chick || this.state !== 'FLYING' || this.skillUsed) return;
    this.skillUsed = true;
    const { x, y } = chick.position;
    if (this.stage === 1) {
      for (let index = -1; index <= 1; index += 1) {
        const shell = Bodies.circle(x + 25, y + index * 15, 8, {
          density: 0.005,
          friction: 0.3,
          label: 'chick',
        }) as GameBody;
        this.track(shell, { radius: 8, hp: 1, maxHp: 1, alive: true });
        Body.setVelocity(shell, { x: chick.velocity.x + 18, y: chick.velocity.y + index * 4 });
        Composite.add(this.engine.world, shell);
      }
    } else if (this.stage === 2) {
      Body.setVelocity(chick, {
        x: Math.max(chick.velocity.x * 1.6, 26),
        y: chick.velocity.y * 0.4,
      });
    } else if (this.stage === 3) {
      Body.setVelocity(chick, { x: chick.velocity.x * 0.8, y: 28 });
    } else {
      this.explode(x, y, 300, 0.22);
    }
    this.publish();
  }

  useItem(kind: ItemKind): void {
    if (!this.alive || this.items[kind] <= 0) return;
    if (this.state === 'PAUSED') return;
    if (kind === 'booster') {
      if (this.state !== 'FLYING' || !this.activeChick) return;
      Body.setVelocity(this.activeChick, {
        x: Math.max(this.activeChick.velocity.x * 1.8, 30),
        y: this.activeChick.velocity.y * 0.2,
      });
    } else if (kind === 'mega') {
      if (this.state !== 'AIMING') return;
      this.megaNext = true;
    } else {
      this.applyQuake();
    }
    this.items = { ...this.items, [kind]: this.items[kind] - 1 };
    this.publish();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.publish();
  }

  pause(): void {
    if (this.state !== 'AIMING' && this.state !== 'FLYING' && this.state !== 'RESOLVING') return;
    this.stateBeforePause = this.state;
    this.state = 'PAUSED';
    this.publish();
  }

  resume(): void {
    if (this.state !== 'PAUSED' || !this.stateBeforePause) return;
    this.state = this.stateBeforePause;
    this.stateBeforePause = null;
    this.publish();
  }

  continueAfterEvolution(): void {
    if (this.state !== 'EVOLUTION' || this.stage >= 4) return;
    this.stage = (this.stage + 1) as GameStage;
    this.loadStage(this.stage);
    this.publish();
  }

  retryStage(): void {
    if (!this.alive) return;
    this.loadStage(this.stage);
    this.publish();
  }

  restartCampaign(): void {
    this.startCampaign();
  }

  step(deltaMs: number): void {
    if (!this.alive || this.state === 'PAUSED') return;
    const delta = clamp(Number.isFinite(deltaMs) ? deltaMs : 16.667, 1, 33.333);
    Engine.update(this.engine, delta);
    this.advanceGimmicks();
    this.applyFans();
    if (this.state === 'WON') {
      this.winFrames += 1;
      if (this.winFrames >= 42) this.state = this.stage === 4 ? 'ENDING' : 'EVOLUTION';
    } else {
      this.checkTurnSettlement();
    }
    this.publish();
  }

  getSnapshot(): GameSnapshot {
    return this.snapshot;
  }

  dispose(): void {
    if (!this.alive) return;
    Events.off(this.engine, 'collisionStart', this.collisionListener);
    Composite.clear(this.engine.world, false, true);
    this.bodies.clear();
    this.fans = [];
    this.alive = false;
  }

  private loadStage(stage: GameStage): void {
    Composite.clear(this.engine.world, false, true);
    this.bodies.clear();
    this.fans = [];
    this.activeChick = null;
    this.skillUsed = false;
    this.megaNext = false;
    this.ammo = STAGES[stage].ammo;
    this.aimPosition = null;
    this.settleFrames = 0;
    this.winFrames = 0;
    this.defeatCause = null;
    this.stateBeforePause = null;
    this.state = 'DIALOGUE';

    const ground = Bodies.rectangle(640, 695, 2560, 50, { isStatic: true, label: 'ground' }) as GameBody;
    const wall = Bodies.rectangle(-20, 360, 40, 1440, { isStatic: true, label: 'wall' }) as GameBody;
    Composite.add(this.engine.world, [ground, wall]);
    STAGES[stage].spawns.forEach((spawn) => this.spawn(spawn));
  }

  private spawn(spec: SpawnSpec): void {
    if (spec.kind === 'fan') {
      this.fans.push({
        x: spec.x,
        y: spec.y,
        width: spec.w ?? 0,
        height: spec.h ?? 0,
        forceX: spec.forceX ?? 0,
        forceY: spec.forceY ?? 0,
      });
      return;
    }

    let body: GameBody;
    let customData: NonNullable<GameBody['customData']>;
    if (spec.kind === 'block') {
      const material = spec.material ?? 'wood';
      const config = BLOCK_CONFIG[material];
      body = Bodies.rectangle(spec.x, spec.y, spec.w ?? 20, spec.h ?? 20, {
        density: config.density,
        friction: 0.6,
        restitution: 0.1,
        label: material === 'tnt' ? 'tnt' : 'block',
      }) as GameBody;
      customData = {
        width: spec.w ?? 20,
        height: spec.h ?? 20,
        material,
        hp: config.hp,
        maxHp: config.hp,
        alive: true,
        destroyed: false,
      };
    } else if (spec.kind === 'cat') {
      const radius = spec.radius ?? 24;
      const hp = spec.boss ? 60 : spec.shield ? 28 : 18;
      body = Bodies.circle(spec.x, spec.y, radius, {
        density: spec.boss ? 0.006 : spec.shield ? 0.004 : 0.0025,
        friction: 0.6,
        restitution: 0.2,
        label: 'enemy',
      }) as GameBody;
      customData = {
        radius,
        hp,
        maxHp: hp,
        alive: true,
        boss: spec.boss,
        shield: spec.shield,
      };
    } else if (spec.kind === 'egg') {
      body = Bodies.circle(spec.x, spec.y, 14, {
        density: 0.002,
        friction: 0.6,
        restitution: 0.15,
        label: 'hostageEgg',
      }) as GameBody;
      customData = { radius: 14, hp: 8.5, maxHp: 8.5, alive: true };
    } else if (spec.kind === 'shutter') {
      body = Bodies.rectangle(spec.x, spec.y, spec.w ?? 24, spec.h ?? 140, {
        isStatic: true,
        friction: 0.2,
        label: 'shutter',
      }) as GameBody;
      customData = {
        width: spec.w ?? 24,
        height: spec.h ?? 140,
        minY: spec.minY ?? spec.y,
        maxY: spec.maxY ?? spec.y,
        speed: spec.speed ?? 1.6,
        direction: 1,
        alive: true,
      };
    } else if (spec.kind === 'trampoline') {
      body = Bodies.rectangle(spec.x, spec.y, spec.w ?? 110, spec.h ?? 25, {
        isStatic: true,
        restitution: 1.85,
        friction: 0.1,
        label: 'bouncePad',
      }) as GameBody;
      customData = { width: spec.w ?? 110, height: spec.h ?? 25, alive: true };
    } else {
      const radius = spec.radius ?? 30;
      body = Bodies.circle(spec.x, spec.y, radius, {
        density: 0.015,
        friction: 0.05,
        restitution: 0.1,
        label: 'boulder',
      }) as GameBody;
      customData = { radius, alive: true };
    }
    this.track(body, customData);
    Composite.add(this.engine.world, body);
  }

  private track(body: GameBody, customData: NonNullable<GameBody['customData']>): void {
    body.customData = customData;
    this.bodies.set(body.id, body);
  }

  private handleCollisions(event: IEventCollision<Matter.Engine>): void {
    for (const { bodyA, bodyB } of event.pairs) {
      const a = bodyA as GameBody;
      const b = bodyB as GameBody;
      if (a.label === 'bouncePad' || b.label === 'bouncePad') {
        const dynamic = a.label === 'bouncePad' ? b : a;
        if (!dynamic.isStatic) {
          Body.setVelocity(dynamic, {
            x: dynamic.velocity.x * 1.3,
            y: -Math.abs(dynamic.velocity.y * 1.7) - 6,
          });
        }
        continue;
      }

      const relativeSpeed = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      const involvesChick = a.label === 'chick' || b.label === 'chick';
      const multiplier = involvesChick ? [1, 1.8, 2.8, 4.5][this.stage - 1] : 1;
      const impact = relativeSpeed * 3.5 * multiplier;
      for (const body of [a, b]) {
        const data = body.customData;
        if (!data || data.alive === false) continue;
        if (body.label === 'hostageEgg') {
          if (impact > 3.2) data.hp = (data.hp ?? 0) - impact;
          if ((data.hp ?? 0) <= 0 || body.position.y > 685) {
            data.alive = false;
            this.state = 'LOST';
            this.defeatCause = 'hostage';
          }
        } else if (body.label === 'block' || body.label === 'tnt') {
          if (impact > 5) {
            data.hp = (data.hp ?? 0) - impact;
            if ((data.hp ?? 0) <= 0 && !data.destroyed) {
              data.destroyed = true;
              data.alive = false;
              if (body.label === 'tnt') this.explode(body.position.x, body.position.y, 230, 0.14);
              else this.score += 180;
              Composite.remove(this.engine.world, body);
            }
          }
        } else if (body.label === 'enemy') {
          const other = body === a ? b : a;
          const frontalChickHit = data.shield && other.label === 'chick' &&
            other.position.x < body.position.x - 5 &&
            !(other.position.y < body.position.y - 15 && Math.abs(other.velocity.y) > 3);
          if (frontalChickHit) {
            if (this.activeChick) {
              Body.setVelocity(this.activeChick, {
                x: -Math.abs(this.activeChick.velocity.x) * 0.7,
                y: -4,
              });
            }
          } else if (impact > 4.5) {
            data.hp = (data.hp ?? 0) - impact;
            if ((data.hp ?? 0) <= 0) {
              data.alive = false;
              this.score += data.boss ? 3000 : data.shield ? 2000 : 1200;
              Composite.remove(this.engine.world, body);
            }
          }
        }
      }
    }
  }

  private explode(x: number, y: number, radius: number, forceMagnitude: number): void {
    this.score += 600;
    for (const body of Composite.allBodies(this.engine.world) as GameBody[]) {
      if (body.isStatic) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 1 || distance >= radius) continue;
      const power = 1 - distance / radius;
      Body.applyForce(body, body.position, {
        x: (dx / distance) * forceMagnitude * power,
        y: (dy / distance) * forceMagnitude * power - 0.06,
      });
      const data = body.customData;
      if (data?.hp !== undefined) {
        data.hp -= power * 50;
        if (data.hp <= 0 && body.label === 'enemy' && data.alive !== false) {
          data.alive = false;
          this.score += data.boss ? 3000 : data.shield ? 2000 : 1200;
          Composite.remove(this.engine.world, body);
        } else if (data.hp <= 0 && (body.label === 'block' || body.label === 'tnt')) {
          data.alive = false;
          data.destroyed = true;
          Composite.remove(this.engine.world, body);
        }
      }
    }
  }

  private applyQuake(): void {
    for (const body of Composite.allBodies(this.engine.world)) {
      if (body.isStatic || body.label === 'chick') continue;
      Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * 0.08,
        y: -0.06 - Math.random() * 0.04,
      });
    }
  }

  private advanceGimmicks(): void {
    for (const body of this.bodies.values()) {
      const data = body.customData;
      if (body.label !== 'shutter' || !data) continue;
      let y = body.position.y + (data.speed ?? 0) * (data.direction ?? 1);
      if (y >= (data.maxY ?? y)) {
        y = data.maxY ?? y;
        data.direction = -1;
      } else if (y <= (data.minY ?? y)) {
        y = data.minY ?? y;
        data.direction = 1;
      }
      Body.setPosition(body, { x: body.position.x, y });
    }
  }

  private applyFans(): void {
    for (const fan of this.fans) {
      for (const body of Composite.allBodies(this.engine.world)) {
        if (body.isStatic) continue;
        if (
          body.position.x >= fan.x - fan.width / 2 &&
          body.position.x <= fan.x + fan.width / 2 &&
          body.position.y >= fan.y - fan.height / 2 &&
          body.position.y <= fan.y + fan.height / 2
        ) {
          Body.applyForce(body, body.position, { x: fan.forceX, y: fan.forceY });
        }
      }
    }
  }

  private checkTurnSettlement(): void {
    if (this.state !== 'FLYING' && this.state !== 'RESOLVING') return;
    const eggBroken = [...this.bodies.values()].some(
      (body) => body.label === 'hostageEgg' && body.customData?.alive === false,
    );
    if (eggBroken) {
      this.state = 'LOST';
      this.defeatCause = 'hostage';
      return;
    }
    const chick = this.activeChick;
    const speed = chick ? Math.hypot(chick.velocity.x, chick.velocity.y) : 0;
    const outOfBounds = chick && (
      chick.position.x > WORLD.width + 150 || chick.position.y > WORLD.height + 60 || chick.position.x < -80
    );
    this.settleFrames = speed < 0.65 || outOfBounds ? this.settleFrames + 1 : 0;
    if (this.settleFrames <= 50) return;

    const catsAlive = [...this.bodies.values()].some(
      (body) => body.label === 'enemy' && body.customData?.alive !== false && body.position.y < WORLD.height + 20,
    );
    if (!catsAlive) {
      this.state = 'WON';
      this.winFrames = 0;
    } else if (this.ammo <= 0) {
      this.state = 'LOST';
      this.defeatCause = 'ammo';
    } else {
      if (chick) {
        Composite.remove(this.engine.world, chick);
        this.bodies.delete(chick.id);
      }
      this.activeChick = null;
      this.skillUsed = false;
      this.aimPosition = null;
      this.state = 'AIMING';
    }
    this.settleFrames = 0;
  }

  private createSnapshot(): GameSnapshot {
    const entities: GameEntityView[] = [];
    for (const body of Composite.allBodies(this.engine.world) as GameBody[]) {
      const data = body.customData;
      if (!['block', 'tnt', 'enemy', 'hostageEgg', 'shutter', 'bouncePad', 'boulder', 'chick'].includes(body.label)) continue;
      const kind: GameEntityView['kind'] = body.label === 'enemy'
        ? 'cat'
        : body.label === 'hostageEgg'
          ? 'egg'
          : body.label === 'bouncePad'
            ? 'trampoline'
            : body.label === 'block' || body.label === 'tnt'
              ? 'block'
              : body.label as GameEntityView['kind'];
      entities.push({
        id: body.id,
        kind,
        x: body.position.x,
        y: body.position.y,
        width: data?.width,
        height: data?.height,
        radius: data?.radius,
        angle: body.angle,
        hp: data?.hp,
        maxHp: data?.maxHp,
        material: data?.material,
        boss: data?.boss,
        shield: data?.shield,
        alive: data?.alive !== false,
      });
    }
    for (const [index, fan] of this.fans.entries()) {
      entities.push({
        id: -index - 1,
        kind: 'fan',
        x: fan.x,
        y: fan.y,
        width: fan.width,
        height: fan.height,
        angle: 0,
        alive: true,
      });
    }
    return {
      screen: 'game',
      stage: this.stage,
      score: this.score,
      ammo: this.ammo,
      campaignComplete: this.state === 'ENDING',
      state: this.state,
      items: { ...this.items } satisfies ItemCounts,
      muted: this.muted,
      entities,
      aimPosition: this.aimPosition ? { ...this.aimPosition } : null,
      defeatCause: this.defeatCause,
      story: STAGES[this.stage].story,
      form: CHICK_FORMS[this.stage],
      evolvedForm: this.state === 'EVOLUTION' ? CHICK_FORMS[Math.min(this.stage + 1, 4) as GameStage] : null,
    };
  }

  private publish(): void {
    this.snapshot = this.createSnapshot();
    this.onSnapshot(this.snapshot);
  }
}
