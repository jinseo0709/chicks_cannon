import {
  Body,
  Bodies,
  Composite,
  Constraint,
  Engine,
  Events,
  Query,
  Sleeping,
  type IEventCollision,
} from 'matter-js';
import { BLOCK_CONFIG, CHICK_FORMS, LAST_STAGE, STAGE_ORDER, STAGE_SCORE_TARGETS, WORLD } from './constants';
import { emptyItemInventory, MAX_ITEM_COUNT, STAGE_CLEAR_REWARDS } from './items';
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
  SlickZone,
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
    shieldLayers?: number;
    anchor?: Point;
    attached?: boolean;
    angularSpeed?: number;
    breakImpact?: number;
    minY?: number;
    maxY?: number;
    speed?: number;
    direction?: number;
    radius?: number;
    projectile?: 'shell' | 'feather';
    expiresAtMs?: number;
    slick?: boolean;
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

type DamageSource = 'chick' | 'block' | 'chandelier' | 'explosion' | 'fall' | 'other';
interface DamageContext {
  source: DamageSource;
  point: Point;
  direction: Point;
  frontal: boolean;
}
interface Explosion { x: number; y: number; radius: number; forceMagnitude: number; }

const activeStates = new Set<GameState>(['AIMING', 'FLYING', 'RESOLVING']);
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const positive = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
const limitedVelocity = (velocity: Point, max: number): Point => {
  const speed = Math.hypot(velocity.x, velocity.y);
  const scale = speed > max ? max / speed : 1;
  return { x: velocity.x * scale, y: velocity.y * scale };
};

export class ChickCannonEngine {
  private readonly engine = Engine.create();
  private readonly collisionListener: (event: IEventCollision<Matter.Engine>) => void;
  private readonly activeCollisionListener: (event: IEventCollision<Matter.Engine>) => void;
  private readonly bodies = new Map<number, GameBody>();
  private readonly chandelierConstraints = new Map<number, Matter.Constraint>();
  private readonly pendingVelocities = new Map<number, { body: GameBody; velocity: Point }>();
  private catsReleased = false;
  private readonly gearContactTimes = new Map<number, number>();
  private explosionQueue: Explosion[] = [];
  private processingExplosions = false;
  private fans: FanField[] = [];
  private state: GameState = 'DIALOGUE';
  private stateBeforePause: 'AIMING' | 'FLYING' | 'RESOLVING' | null = null;
  private stage: GameStage = 1;
  private score = 0;
  private stageScore = 0;
  private stageEntryCampaignScore = 0;
  private replayOnly = false;
  private stageStars: 0 | 1 | 2 | 3 = 0;
  private bonusChallengeElapsedMs = 0;
  private bonusChallengeStatus: GameSnapshot['bonusChallengeStatus'] = 'ready';
  private ammo = STAGES[1].ammo;
  private items = emptyItemInventory();
  private stageEntryItems = emptyItemInventory();
  private eggCushionActive = false;
  private stageEntryEggCushionActive = false;
  private finalRewardClaimed = false;
  private targetingItem: 'butter' | null = null;
  private slickZones: SlickZone[] = [];
  private scorePopups: Array<{ id: number; x: number; y: number; value: number; label?: string; expiresAtMs: number }> = [];
  private nextScorePopupId = 0;
  private nextSlickId = 0;
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
    this.engine.enableSleeping = true;
    this.engine.gravity.y = WORLD.gravityY;
    this.engine.gravity.x = 0;
    this.collisionListener = (event) => this.handleCollisions(event);
    this.activeCollisionListener = (event) => this.handleGearContacts(event);
    Events.on(this.engine, 'collisionStart', this.collisionListener);
    Events.on(this.engine, 'collisionActive', this.activeCollisionListener);
    this.loadStage(1);
    this.snapshot = this.createSnapshot();
    this.publish();
  }

  startCampaign(): void {
    this.stage = 1;
    this.score = 0;
    this.stageScore = 0;
    this.stageEntryCampaignScore = 0;
    this.replayOnly = false;
    this.items = emptyItemInventory();
    this.stageEntryItems = { ...this.items };
    this.eggCushionActive = false;
    this.stageEntryEggCushionActive = false;
    this.finalRewardClaimed = false;
    this.megaNext = false;
    this.loadStage(1);
    this.publish();
  }

  selectStage(stage: GameStage, replay = false): void {
    if (!this.alive || !STAGE_ORDER.includes(stage)) return;
    this.stage = stage;
    this.stageEntryCampaignScore = this.score;
    this.stageScore = 0;
    this.replayOnly = replay;
    this.stageEntryItems = { ...this.items };
    this.stageEntryEggCushionActive = this.eggCushionActive;
    this.loadStage(stage);
    this.publish();
  }

  dismissDialogue(): void {
    if (this.state !== 'DIALOGUE') return;
    this.bonusChallengeElapsedMs = 0;
    this.bonusChallengeStatus = 'running';
    this.state = 'AIMING';
    this.publish();
  }

  setAim(position: Point): void {
    if (!this.alive || this.state !== 'AIMING' || this.targetingItem || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
    const dx = position.x - WORLD.cannon.x;
    const dy = position.y - WORLD.cannon.y;
    const distance = Math.hypot(dx, dy);
    const ratio = distance > WORLD.maxDrag ? WORLD.maxDrag / distance : 1;
    this.aimPosition = { x: WORLD.cannon.x + dx * ratio, y: WORLD.cannon.y + dy * ratio };
    this.publish();
  }

  releaseAim(): void {
    if (!this.alive || this.state !== 'AIMING' || this.targetingItem || this.ammo <= 0 || !this.aimPosition) return;
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
      collisionFilter: { group: Body.nextGroup(true) },
    }) as GameBody;
    this.track(chick, { radius, hp: 1, maxHp: 1, alive: true });
    const power = (Math.min(distance, WORLD.maxDrag) / WORLD.maxDrag) * form.launchPower;
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
    if (!chick || this.state !== 'FLYING' || this.targetingItem || this.skillUsed) return;
    this.skillUsed = true;
    const { x, y } = chick.position;
    const skillKind = CHICK_FORMS[this.stage].skillKind;
    if (skillKind === 'shell') {
      for (let index = -1; index <= 1; index += 1) {
        const shell = Bodies.circle(x + 25, y + index * 15, 8, {
          density: 0.005,
          friction: 0.3,
          label: 'chick',
          collisionFilter: { group: chick.collisionFilter.group },
        }) as GameBody;
        this.track(shell, { radius: 8, hp: 1, maxHp: 1, alive: true, projectile: 'shell', expiresAtMs: this.engine.timing.timestamp + 3000 });
        Body.setVelocity(shell, { x: chick.velocity.x + 18, y: chick.velocity.y + index * 4 });
        Composite.add(this.engine.world, shell);
      }
    } else if (skillKind === 'boost') {
      Body.setVelocity(chick, {
        x: Math.max(chick.velocity.x * 1.6, 26),
        y: chick.velocity.y * 0.4,
      });
    } else if (skillKind === 'meteor') {
      Body.setVelocity(chick, { x: chick.velocity.x * 0.8, y: 28 });
    } else {
      const angle = Math.atan2(chick.velocity.y, chick.velocity.x);
      const offset = (chick.customData?.radius ?? CHICK_FORMS[this.stage].radius) + 10;
      for (const spread of [-0.45, -0.30, -0.15, 0, 0.15, 0.30, 0.45]) {
        const feather = Bodies.circle(x + Math.cos(angle) * offset, y + Math.sin(angle) * offset, 6, {
          density: 0.004, restitution: 0.1, label: 'chick',
          collisionFilter: { group: chick.collisionFilter.group },
        }) as GameBody;
        this.track(feather, { radius: 6, hp: 1, maxHp: 1, alive: true, projectile: 'feather', expiresAtMs: this.engine.timing.timestamp + 2000 });
        Body.setVelocity(feather, { x: Math.cos(angle + spread) * 32, y: Math.sin(angle + spread) * 32 });
        Composite.add(this.engine.world, feather);
      }
    }
    this.publish();
  }

  useItem(kind: ItemKind): boolean {
    if (!this.alive || !activeStates.has(this.state) || !this.items[kind]) return false;
    if (kind === 'cushion') {
      if (this.eggCushionActive) return false;
      this.eggCushionActive = true;
      this.items = { ...this.items, cushion: this.items.cushion - 1 };
      this.publish();
      return true;
    }
    if (kind === 'butter') {
      this.targetingItem = this.targetingItem === 'butter' ? null : 'butter';
      this.aimPosition = null;
      this.publish();
      return true;
    }
    if (kind === 'booster') {
      if (this.state !== 'FLYING' || !this.activeChick) return false;
      Body.setVelocity(this.activeChick, {
        x: Math.max(this.activeChick.velocity.x * 1.8, 30),
        y: this.activeChick.velocity.y * 0.2,
      });
    } else if (kind === 'mega') {
      if (this.state !== 'AIMING') return false;
      this.megaNext = true;
    } else {
      this.applyQuake();
    }
    this.targetingItem = null;
    this.items = { ...this.items, [kind]: this.items[kind] - 1 };
    this.publish();
    return true;
  }

  applyTargetedItem(point: Point): boolean {
    if (!this.alive || !activeStates.has(this.state) || this.targetingItem !== 'butter' || !this.items.butter ||
      !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > WORLD.width || point.y < 0 || point.y > WORLD.height) return false;
    const candidates = [...this.bodies.values()].filter((body) =>
      !body.isStatic && body.customData?.alive !== false && (body.label === 'block' || body.label === 'tnt'));
    const target = (Query.point(candidates, point) as GameBody[]).sort((a, b) =>
      Math.hypot(a.position.x - point.x, a.position.y - point.y) - Math.hypot(b.position.x - point.x, b.position.y - point.y))[0];
    if (target) {
      target.friction = 0;
      target.frictionStatic = 0;
      target.customData!.slick = true;
      this.nudgeButterTarget(target);
    } else if (point.y >= 660) {
      const grounds = Composite.allBodies(this.engine.world).filter((body) => body.label === 'ground');
      if (!grounds.length) return false;
      const center = clamp(point.x, 90, WORLD.width - 90);
      const start = center - 90;
      const end = center + 90;
      const { friction, frictionStatic } = grounds[0];
      grounds.forEach((ground) => Composite.remove(this.engine.world, ground));
      const ranges = [{ left: -640, right: start, slick: false }, { left: start, right: end, slick: true }, { left: end, right: 1920, slick: false }];
      for (const range of ranges) {
        Composite.add(this.engine.world, Bodies.rectangle((range.left + range.right) / 2, 695, range.right - range.left, 50, {
          isStatic: true, label: 'ground', friction: range.slick ? 0 : friction, frictionStatic: range.slick ? 0 : frictionStatic,
        }));
      }
      this.slickZones = [{ id: ++this.nextSlickId, x: center, width: 180 }];
      for (const body of this.bodies.values()) {
        if (!body.isStatic && body.customData?.alive !== false && ['block', 'tnt', 'enemy'].includes(body.label) &&
          body.position.x >= start && body.position.x <= end && body.bounds.max.y >= 668 && body.bounds.max.y <= 690) this.nudgeButterTarget(body);
      }
    } else return false;
    this.items = { ...this.items, butter: this.items.butter - 1 };
    this.targetingItem = null;
    this.aimPosition = null;
    this.publish();
    return true;
  }

  cancelTargetedItem(): void {
    if (!this.targetingItem) return;
    this.targetingItem = null;
    this.aimPosition = null;
    this.publish();
  }

  cancelAim(): void {
    if (!this.aimPosition) return;
    this.aimPosition = null;
    this.publish();
  }

  private nudgeButterTarget(body: GameBody): void {
    const height = body.customData?.height ?? (body.customData?.radius ?? 24) * 2;
    Body.applyForce(body, { x: body.position.x, y: body.position.y + height * 0.3 }, { x: body.mass * 0.0008, y: 0 });
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.publish();
  }

  pause(): void {
    if (this.state !== 'AIMING' && this.state !== 'FLYING' && this.state !== 'RESOLVING') return;
    this.stateBeforePause = this.state;
    this.targetingItem = null;
    this.aimPosition = null;
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
    const next = STAGE_ORDER[STAGE_ORDER.indexOf(this.stage) + 1];
    if (this.state !== 'EVOLUTION' || !next) return;
    this.stage = next;
    this.stageEntryCampaignScore = this.score;
    this.stageScore = 0;
    this.replayOnly = false;
    this.stageEntryItems = { ...this.items };
    this.stageEntryEggCushionActive = this.eggCushionActive;
    this.loadStage(this.stage);
    this.publish();
  }

  retryStage(): void {
    if (!this.alive) return;
    this.score = this.stageEntryCampaignScore;
    this.stageScore = 0;
    this.items = { ...this.stageEntryItems };
    this.eggCushionActive = this.stageEntryEggCushionActive;
    this.loadStage(this.stage);
    this.publish();
  }

  restartCampaign(): void {
    this.startCampaign();
  }

  claimFinalReward(kind: ItemKind): boolean {
    if (!this.alive || this.state !== 'ENDING' || this.stage !== LAST_STAGE || this.finalRewardClaimed ||
      this.items[kind] >= MAX_ITEM_COUNT) return false;
    this.items = { ...this.items, [kind]: this.items[kind] + 1 };
    this.finalRewardClaimed = true;
    this.publish();
    return true;
  }

  step(deltaMs: number): void {
    if (!this.alive || this.state === 'PAUSED') return;
    const delta = clamp(Number.isFinite(deltaMs) ? deltaMs : 16.667, 1, 33.333);
    if (this.bonusChallengeStatus === 'running' && activeStates.has(this.state)) {
      this.bonusChallengeElapsedMs += delta;
      if (this.bonusChallengeElapsedMs >= STAGES[this.stage].bonusChallenge.timeLimitMs) this.bonusChallengeStatus = 'expired';
    }
    Engine.update(this.engine, delta);
    for (const { body, velocity } of this.pendingVelocities.values()) {
      if (body.customData?.alive !== false) Body.setVelocity(body, velocity);
    }
    this.pendingVelocities.clear();
    this.scorePopups = this.scorePopups.filter((popup) => popup.expiresAtMs > this.engine.timing.timestamp);
    this.advanceGimmicks(delta);
    this.applyFans();
    for (const body of this.bodies.values()) {
      if (body.customData?.expiresAtMs !== undefined && body.customData.expiresAtMs <= this.engine.timing.timestamp) {
        this.removeBody(body);
        continue;
      }
      if (body.label === 'enemy' && (body.position.y > WORLD.height + 60 || body.position.x > WORLD.width + 150)) {
        this.defeatCat(body, { source: 'fall', point: { ...body.position }, direction: { x: 1, y: 0 }, frontal: false });
      }
    }
    if (this.state === 'WON') {
      this.winFrames += 1;
      if (this.winFrames >= 42) {
        if (this.stage === LAST_STAGE) {
          this.finalRewardClaimed = false;
          this.state = 'ENDING';
        } else {
          const reward = STAGE_CLEAR_REWARDS[this.stage];
          if (reward) this.grantItem(reward);
          this.state = 'EVOLUTION';
        }
      }
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
    Events.off(this.engine, 'collisionActive', this.activeCollisionListener);
    Composite.clear(this.engine.world, false, true);
    this.bodies.clear();
    this.clearGimmickState();
    this.fans = [];
    this.alive = false;
  }

  private loadStage(stage: GameStage): void {
    Composite.clear(this.engine.world, false, true);
    this.bodies.clear();
    this.clearGimmickState();
    this.fans = [];
    this.activeChick = null;
    this.skillUsed = false;
    this.megaNext = false;
    this.ammo = STAGES[stage].ammo;
    if (stage === LAST_STAGE) this.finalRewardClaimed = false;
    this.stageStars = 0;
    this.bonusChallengeElapsedMs = 0;
    this.bonusChallengeStatus = 'ready';
    this.targetingItem = null;
    this.slickZones = [];
    this.scorePopups = [];
    this.aimPosition = null;
    this.settleFrames = 0;
    this.winFrames = 0;
    this.defeatCause = null;
    this.stateBeforePause = null;
    this.catsReleased = false;
    this.state = 'DIALOGUE';

    const ground = Bodies.rectangle(640, 695, 2560, 50, { isStatic: true, label: 'ground' }) as GameBody;
    const wall = Bodies.rectangle(-20, 360, 40, 1440, { isStatic: true, label: 'wall' }) as GameBody;
    Composite.add(this.engine.world, [ground, wall]);
    STAGES[stage].spawns.forEach((spawn) => this.spawn(spawn));
  }

  private spawn(spec: SpawnSpec): void {
    if (!Number.isFinite(spec.x) || !Number.isFinite(spec.y)) return;
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
      const width = positive(spec.w, 20);
      const height = positive(spec.h, 20);
      body = Bodies.rectangle(spec.x, spec.y, width, height, {
        density: config.density,
        friction: config.friction ?? 0.6,
        restitution: config.restitution ?? 0.1,
        label: material === 'tnt' ? 'tnt' : 'block',
      }) as GameBody;
      customData = {
        width,
        height,
        material,
        hp: config.hp,
        maxHp: config.hp,
        alive: true,
        destroyed: false,
      };
    } else if (spec.kind === 'cat') {
      const radius = positive(spec.radius, 24);
      const shieldLayers = clamp(Math.trunc(Number.isFinite(spec.shieldLayers) ? spec.shieldLayers! : spec.shield ? 1 : 0), 0, 2);
      const shield = Boolean(spec.shield || shieldLayers > 0);
      const hp = positive(spec.hp, spec.boss ? 60 : shield ? 28 : 18);
      body = Bodies.circle(spec.x, spec.y, radius, {
        density: spec.boss ? 0.006 : shield ? 0.004 : 0.0025,
        friction: 0.6,
        restitution: 0.2,
        label: 'enemy',
      }) as GameBody;
      Body.setStatic(body, true);
      customData = {
        radius,
        hp,
        maxHp: hp,
        alive: true,
        boss: spec.boss,
        shield,
        shieldLayers,
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
    } else if (spec.kind === 'tire' || spec.kind === 'gear') {
      const radius = positive(spec.radius, spec.kind === 'tire' ? 40 : 44);
      body = Bodies.circle(spec.x, spec.y, radius, {
        isStatic: true,
        restitution: spec.kind === 'tire' ? 0 : 0.15,
        friction: spec.kind === 'tire' ? 0.8 : 0.3,
        label: spec.kind,
      }) as GameBody;
      customData = {
        radius,
        alive: true,
        angularSpeed: spec.kind === 'gear' ? (Number.isFinite(spec.angularSpeed) ? spec.angularSpeed : 0.025) : undefined,
      };
    } else if (spec.kind === 'chandelier') {
      const width = positive(spec.w, 100);
      const height = positive(spec.h, 36);
      const anchor = spec.anchor && Number.isFinite(spec.anchor.x) && Number.isFinite(spec.anchor.y)
        ? { ...spec.anchor } : { x: spec.x, y: spec.y - 140 };
      body = Bodies.rectangle(spec.x, spec.y, width, height, {
        density: 0.012, friction: 0.5, restitution: 0.1, label: 'chandelier',
      }) as GameBody;
      const constraint = Constraint.create({
        pointA: anchor, bodyB: body, pointB: { x: 0, y: 0 },
        length: Math.hypot(spec.x - anchor.x, spec.y - anchor.y), stiffness: 0.95, damping: 0.04,
      });
      this.chandelierConstraints.set(body.id, constraint);
      Composite.add(this.engine.world, constraint);
      Body.setVelocity(body, { x: 0.6, y: 0 });
      Body.setAngularVelocity(body, 0.008);
      customData = { width, height, anchor, attached: true, alive: true, breakImpact: positive(spec.breakImpact, 18) };
    } else {
      const radius = positive(spec.radius, 30);
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

  private clearGimmickState(): void {
    this.chandelierConstraints.clear();
    this.pendingVelocities.clear();
    this.gearContactTimes.clear();
    this.explosionQueue = [];
    this.processingExplosions = false;
  }

  private detachChandelier(body: GameBody): void {
    const constraint = this.chandelierConstraints.get(body.id);
    if (!constraint) return;
    Composite.remove(this.engine.world, constraint);
    this.chandelierConstraints.delete(body.id);
    if (body.customData) body.customData.attached = false;
  }

  private removeBody(body: GameBody): void {
    this.detachChandelier(body);
    Composite.remove(this.engine.world, body);
    this.bodies.delete(body.id);
    this.pendingVelocities.delete(body.id);
    this.gearContactTimes.delete(body.id);
  }

  private handleGearContacts(event: IEventCollision<Matter.Engine>): void {
    for (const { bodyA, bodyB } of event.pairs) {
      const gear = (bodyA.label === 'gear' ? bodyA : bodyB.label === 'gear' ? bodyB : null) as GameBody | null;
      if (!gear) continue;
      const dynamic = (gear === bodyA ? bodyB : bodyA) as GameBody;
      if (dynamic.isStatic || dynamic.customData?.alive === false) continue;
      const now = this.engine.timing.timestamp;
      if (now - (this.gearContactTimes.get(dynamic.id) ?? -Infinity) < 100) continue;
      this.gearContactTimes.set(dynamic.id, now);
      const dx = dynamic.position.x - gear.position.x;
      const dy = dynamic.position.y - gear.position.y;
      const distance = Math.hypot(dx, dy) || 1;
      const sign = Math.sign(gear.customData?.angularSpeed ?? 0.025);
      const velocity = this.pendingVelocities.get(dynamic.id)?.velocity ?? dynamic.velocity;
      this.pendingVelocities.set(dynamic.id, {
        body: dynamic,
        velocity: limitedVelocity({ x: velocity.x - dy / distance * sign * 2.5, y: velocity.y + dx / distance * sign * 2.5 }, 45),
      });
    }
  }

  private handleCollisions(event: IEventCollision<Matter.Engine>): void {
    this.handleGearContacts(event);
    for (const { bodyA, bodyB, collision } of event.pairs) {
      const a = bodyA as GameBody;
      const b = bodyB as GameBody;
      if (a.customData?.alive === false || b.customData?.alive === false) continue;
      const involvesChick = a.label === 'chick' || b.label === 'chick';
      if (!this.catsReleased && !involvesChick) continue;
      if (involvesChick && [a.label, b.label].some((label) =>
        ['block', 'tnt', 'enemy', 'tire', 'gear', 'shutter', 'bouncePad', 'boulder', 'chandelier'].includes(label))) {
        this.releaseCats();
      }
      if (a.label === 'tire' || b.label === 'tire') {
        const tire = a.label === 'tire' ? a : b;
        const dynamic = tire === a ? b : a;
        if (!dynamic.isStatic && !this.pendingVelocities.has(dynamic.id)) {
          const dx = dynamic.position.x - tire.position.x;
          const dy = dynamic.position.y - tire.position.y;
          const distance = Math.hypot(dx, dy) || 1;
          const nx = dx / distance;
          const ny = dy / distance;
          const dot = dynamic.velocity.x * nx + dynamic.velocity.y * ny;
          if (dot < 0) {
            this.pendingVelocities.set(dynamic.id, { body: dynamic, velocity: limitedVelocity({
              x: (dynamic.velocity.x - 2 * dot * nx) * 1.8,
              y: (dynamic.velocity.y - 2 * dot * ny) * 1.8,
            }, 55) });
          }
        }
        continue;
      }
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
      const multiplier = involvesChick ? CHICK_FORMS[this.stage].damageMultiplier : 1;
      const impact = relativeSpeed * 3.5 * multiplier;
      const contact = collision?.supports?.[0];
      const point = contact && Number.isFinite(contact.x) && Number.isFinite(contact.y)
        ? { x: contact.x, y: contact.y }
        : { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 };
      for (const body of [a, b]) {
        const data = body.customData;
        if (!data || data.alive === false) continue;
        const other = body === a ? b : a;
        if (body.label === 'chandelier' && relativeSpeed * 3.5 >= (data.breakImpact ?? 18)) this.detachChandelier(body);
        const dx = body.position.x - other.position.x;
        const dy = body.position.y - other.position.y;
        const distance = Math.hypot(dx, dy);
        const source: DamageSource = other.label === 'chick' ? 'chick'
          : other.label === 'block' || other.label === 'tnt' || other.label === 'boulder' ? 'block'
            : other.label === 'chandelier' ? 'chandelier' : 'other';
        const context: DamageContext = {
          source, point,
          direction: distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 },
          frontal: other.label === 'chick' && other.position.x < body.position.x - 5 &&
            !(other.position.y < body.position.y - 15 && Math.abs(other.velocity.y) > 3),
        };
        if (body.label === 'enemy' && impact > 4.5 && context.frontal && (data.shieldLayers ?? 0) > 0) {
          data.shieldLayers! -= 1;
          this.awardScore(500, body.position.x, body.position.y - 30, '방패 파괴');
          Body.setVelocity(other, { x: -Math.abs(other.velocity.x) * 0.7, y: -4 });
        } else if (body.label === 'hostageEgg') {
          this.damageBody(body, impact > 3.2 ? impact : 0, context);
        } else if ((body.label === 'enemy' && impact > 4.5) ||
          ((body.label === 'block' || body.label === 'tnt') && impact > 5)) {
          this.damageBody(body, impact, context);
        }
      }
    }
  }

  private damageBody(body: GameBody, amount: number, context: DamageContext): void {
    const data = body.customData;
    if (!data || data.alive === false || data.hp === undefined) return;
    data.hp -= Math.max(0, amount);
    if (body.label === 'hostageEgg') {
      if (data.hp <= 0 || body.position.y > 685) {
        data.alive = false;
        if (this.eggCushionActive) this.eggCushionActive = false;
        else this.applyStagePenalty(500, body.position.x, body.position.y, '알 파손');
        this.removeBody(body);
      }
    } else if (data.hp <= 0 && body.label === 'enemy') {
      this.defeatCat(body, context);
    } else if (data.hp <= 0 && (body.label === 'block' || body.label === 'tnt')) {
      this.breakBlock(body, context);
    }
  }

  private defeatCat(body: GameBody, _context: DamageContext): void {
    const data = body.customData;
    if (!data || data.alive === false) return;
    data.alive = false;
    const reward = data.boss ? 3000 : data.shield ? 2000 : 1200;
    this.awardScore(reward, body.position.x, body.position.y - 24, data.boss ? '보스 격파' : '고양이 격파');
    this.removeBody(body);
  }

  private releaseCats(): void {
    if (this.catsReleased) return;
    this.catsReleased = true;
    for (const body of this.bodies.values()) {
      if (body.label !== 'enemy' || !body.isStatic) continue;
      Body.setStatic(body, false);
      Sleeping.set(body, false);
    }
  }

  private breakBlock(body: GameBody, _context: DamageContext): void {
    const data = body.customData;
    if (!data || data.alive === false || data.destroyed) return;
    data.destroyed = true;
    data.alive = false;
    this.removeBody(body);
    if (body.label === 'tnt') this.explode(body.position.x, body.position.y, 230, 0.14);
    else this.awardScore(180, body.position.x, body.position.y, '파괴');
  }

  private explode(x: number, y: number, radius: number, forceMagnitude: number): void {
    this.explosionQueue.push({ x, y, radius, forceMagnitude });
    if (this.processingExplosions) return;
    this.processingExplosions = true;
    try {
      while (this.explosionQueue.length > 0) {
        const explosion = this.explosionQueue.shift()!;
        this.awardScore(600, explosion.x, explosion.y - 18, '폭발');
        for (const body of Composite.allBodies(this.engine.world) as GameBody[]) {
          if (body.isStatic || body.customData?.alive === false) continue;
          const dx = body.position.x - explosion.x;
          const dy = body.position.y - explosion.y;
          const distance = Math.hypot(dx, dy);
          if (distance >= explosion.radius) continue;
          const power = 1 - distance / explosion.radius;
          const direction = distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
          Body.applyForce(body, body.position, {
            x: direction.x * explosion.forceMagnitude * power,
            y: direction.y * explosion.forceMagnitude * power - 0.06,
          });
          this.damageBody(body, power * 50, {
            source: 'explosion', point: { ...body.position }, direction, frontal: false,
          });
        }
      }
    } finally {
      this.processingExplosions = false;
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

  private awardScore(value: number, x: number, y: number, label?: string): void {
    this.stageScore += value;
    if (!this.replayOnly) this.score += value;
    this.scorePopups.push({
      id: ++this.nextScorePopupId,
      x,
      y,
      value,
      label,
      expiresAtMs: this.engine.timing.timestamp + 1100,
    });
  }

  private advanceGimmicks(deltaMs: number): void {
    for (const body of this.bodies.values()) {
      const data = body.customData;
      if (body.label === 'gear' && data) {
        Body.setAngle(body, body.angle + (data.angularSpeed ?? 0.025) * deltaMs / 16.667);
        continue;
      }
      if (body.label !== 'shutter' || !data) continue;
      let y = body.position.y + (data.speed ?? 0) * (data.direction ?? 1) * deltaMs / 16.667;
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
        if (body.isStatic || body.label !== 'chick') continue;
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
      this.stageStars = this.calculateStageStars();
      if (this.bonusChallengeStatus === 'running' && this.bonusChallengeElapsedMs <= STAGES[this.stage].bonusChallenge.timeLimitMs) {
        this.bonusChallengeStatus = 'success';
        this.awardScore(STAGES[this.stage].bonusChallenge.bonusScore, 640, 120, '시간 도전 성공');
      } else if (this.bonusChallengeStatus === 'running') {
        this.bonusChallengeStatus = 'expired';
      }
      this.winFrames = 0;
    } else if (this.ammo <= 0) {
      this.state = 'LOST';
      this.defeatCause = 'ammo';
    } else {
      if (chick) {
        this.removeBody(chick);
      }
      this.activeChick = null;
      this.skillUsed = false;
      this.aimPosition = null;
      this.state = 'AIMING';
    }
    this.settleFrames = 0;
  }

  private applyStagePenalty(value: number, x: number, y: number, label: string): void {
    const previous = this.stageScore;
    this.stageScore = Math.max(0, this.stageScore - value);
    const delta = this.stageScore - previous;
    if (!this.replayOnly) this.score += delta;
    this.scorePopups.push({
      id: ++this.nextScorePopupId,
      x,
      y,
      value: delta,
      label,
      expiresAtMs: this.engine.timing.timestamp + 1100,
    });
  }

  private calculateStageStars(): 1 | 2 | 3 {
    const ammoForThreeStars = Math.ceil(STAGES[this.stage].ammo / 2);
    if (this.ammo >= ammoForThreeStars && this.stageScore >= STAGE_SCORE_TARGETS[this.stage]) return 3;
    if (this.ammo >= 1) return 2;
    return 1;
  }

  private grantItem(kind: ItemKind): void {
    if (this.items[kind] >= MAX_ITEM_COUNT) return;
    this.items = { ...this.items, [kind]: this.items[kind] + 1 };
  }

  private createSnapshot(): GameSnapshot {
    const entities: GameEntityView[] = [];
    for (const body of Composite.allBodies(this.engine.world) as GameBody[]) {
      const data = body.customData;
      if (!['block', 'tnt', 'enemy', 'hostageEgg', 'shutter', 'bouncePad', 'boulder', 'chick', 'tire', 'gear', 'chandelier'].includes(body.label)) continue;
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
        shieldLayers: data?.shieldLayers,
        anchor: data?.anchor ? { ...data.anchor } : undefined,
        attached: data?.attached,
        angularSpeed: data?.angularSpeed,
        projectile: data?.projectile,
        expiresAtMs: data?.expiresAtMs,
        slick: data?.slick,
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
      stageScore: this.stageScore,
      scoreTarget: STAGE_SCORE_TARGETS[this.stage],
      stageAmmo: STAGES[this.stage].ammo,
      stageStars: this.stageStars,
      bonusChallengeRemainingMs: Math.max(0, STAGES[this.stage].bonusChallenge.timeLimitMs - this.bonusChallengeElapsedMs),
      bonusChallengeStatus: this.bonusChallengeStatus,
      ammo: this.ammo,
      campaignComplete: this.state === 'ENDING',
      state: this.state,
      items: { ...this.items } satisfies ItemCounts,
      eggCushionActive: this.eggCushionActive,
      finalRewardClaimed: this.finalRewardClaimed,
      targetingItem: this.targetingItem,
      slickZones: this.slickZones.map((zone) => ({ ...zone })),
      scorePopups: this.scorePopups.map((popup) => ({
        id: popup.id,
        x: popup.x,
        y: popup.y,
        value: popup.value,
        label: popup.label,
        remainingMs: Math.max(0, popup.expiresAtMs - this.engine.timing.timestamp),
      })),
      muted: this.muted,
      entities,
      aimPosition: this.aimPosition ? { ...this.aimPosition } : null,
      defeatCause: this.defeatCause,
      story: STAGES[this.stage].story,
      form: CHICK_FORMS[this.stage],
      evolvedForm: this.state === 'EVOLUTION' && this.stage !== LAST_STAGE
        ? CHICK_FORMS[STAGE_ORDER[STAGE_ORDER.indexOf(this.stage) + 1]] : null,
    };
  }

  private publish(): void {
    if (!activeStates.has(this.state)) {
      this.targetingItem = null;
      this.aimPosition = null;
    }
    this.snapshot = this.createSnapshot();
    this.onSnapshot(this.snapshot);
  }
}
