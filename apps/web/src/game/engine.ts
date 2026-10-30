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
import { BLOCK_CONFIG, CHICK_FORMS, CHICK_SKILL_RANGE, LAST_STAGE, STAGE_ORDER, STAGE_SCORE_TARGETS, WORLD } from './constants';
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

const FINAL_BOSS_VICTORY_DISPLAY_MS = 2600;
const CHICK_SKILL_COOLDOWN_MS = 15000;
const BOSS_MAX_HP = 500;
// Debris damage uses E = 1/2 * effective mass * closing speed^2, with a low-energy threshold.
// A cat can take at most 10 environmental damage in a 750ms collapse window.
const ENVIRONMENTAL_IMPACT_MIN_ENERGY = 80;
const ENVIRONMENTAL_IMPACT_DAMAGE_PER_ENERGY = 0.04;
const ENVIRONMENTAL_IMPACT_MAX_DAMAGE = 12;
const ENVIRONMENTAL_DAMAGE_WINDOW_MS = 750;
const ENVIRONMENTAL_DAMAGE_WINDOW_CAP = 10;

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
    shieldBroken?: boolean;
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
    triggerImpact?: number;
    forceX?: number;
    forceY?: number;
    initialAngle?: number;
    pivotOffset?: Point;
    flowerLauncherId?: number;
    triggered?: boolean;
    spent?: boolean;
    projectile?: 'shell' | 'feather';
    expiresAtMs?: number;
    slick?: boolean;
    chandelierId?: number;
    ropeId?: number;
    seesawTriggered?: boolean;
    armed?: boolean;
    weakpointArmed?: boolean;
    weakpointHit?: boolean;
    stageFrozen?: boolean;
    environmentalDamageWindowStartMs?: number;
    environmentalDamageInWindow?: number;
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
  bypassEnvironmentalCap?: boolean;
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
  private bossDamagePopups: Array<{ id: number; x: number; y: number; damage: number; expiresAtMs: number }> = [];
  private bossHp = 0;
  private bossMaxHp = 0;
  private bossHitRemainingMs = 0;
  private bossRageElapsedMs = 0;
  private bossShockwaveRemainingMs = 0;
  private nextScorePopupId = 0;
  private nextSlickId = 0;
  private muted = false;
  private aimPosition: Point | null = null;
  private activeChick: GameBody | null = null;
  private skillCooldownRemainingMs = 0;
  private megaNext = false;
  private boosterNext = false;
  private quakeNext = false;
  private settleFrames = 0;
  private winElapsedMs = 0;
  private defeatCause: 'ammo' | 'hostage' | 'timer' | null = null;
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
    this.boosterNext = false;
    this.quakeNext = false;
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
    if (distance < WORLD.cancelDragRadius) {
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
    const power = (Math.min(distance, WORLD.maxDrag) / WORLD.maxDrag) * form.launchPower * 1.2;
    const angle = Math.atan2(dy, dx);
    let launchVelocity = { x: Math.cos(angle) * power, y: Math.sin(angle) * power };
    if (this.boosterNext) launchVelocity = { x: Math.max(launchVelocity.x * 1.8, 30), y: launchVelocity.y * 0.2 };
    Body.setVelocity(chick, launchVelocity);
    Composite.add(this.engine.world, chick);
    this.activeChick = chick;
    this.megaNext = false;
    if (this.boosterNext) this.items = { ...this.items, booster: this.items.booster - 1 };
    if (this.quakeNext) {
      this.items = { ...this.items, quake: this.items.quake - 1 };
      this.applyQuake();
    }
    this.boosterNext = false;
    this.quakeNext = false;
    if (this.items.mega > 0 && radius > form.radius) this.items = { ...this.items, mega: this.items.mega - 1 };
    this.ammo -= 1;
    this.state = 'FLYING';
    this.aimPosition = null;
    this.settleFrames = 0;
    this.publish();
  }

  activateSkill(): void {
    const chick = this.activeChick;
    if (!chick || this.state !== 'FLYING' || this.targetingItem || this.skillCooldownRemainingMs > 0) return;
    const nearbyEnemy = [...this.bodies.values()].some((body) =>
      body.label === 'enemy' && body.customData?.alive !== false &&
      Math.hypot(body.position.x - chick.position.x, body.position.y - chick.position.y) <= CHICK_SKILL_RANGE,
    );
    if (!nearbyEnemy) return;
    this.skillCooldownRemainingMs = CHICK_SKILL_COOLDOWN_MS;
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
      if (this.state === 'AIMING') {
        this.boosterNext = !this.boosterNext;
        this.publish();
        return true;
      }
      if (this.state !== 'FLYING' || !this.activeChick) return false;
      Body.setVelocity(this.activeChick, {
        x: Math.max(this.activeChick.velocity.x * 1.8, 30),
        y: this.activeChick.velocity.y * 0.2,
      });
    } else if (kind === 'mega') {
      if (this.state !== 'AIMING') return false;
      this.megaNext = !this.megaNext;
      this.publish();
      return true;
    } else if (kind === 'quake' && this.state === 'AIMING') {
      this.quakeNext = !this.quakeNext;
      this.publish();
      return true;
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
    if (!this.alive || this.state !== 'ENDING' || this.bossRole !== 'final' || this.finalRewardClaimed ||
      this.items[kind] >= MAX_ITEM_COUNT) return false;
    this.items = { ...this.items, [kind]: this.items[kind] + 1 };
    this.finalRewardClaimed = true;
    this.publish();
    return true;
  }

  step(deltaMs: number): void {
    if (!this.alive || this.state === 'PAUSED' || this.state === 'DIALOGUE') return;
    const delta = clamp(Number.isFinite(deltaMs) ? deltaMs : 16.667, 1, 33.333);
    if (this.state === 'WON') {
      this.advanceStageClear(delta);
      this.publish();
      return;
    }
    this.skillCooldownRemainingMs = Math.max(0, this.skillCooldownRemainingMs - delta);
    this.bossHitRemainingMs = Math.max(0, this.bossHitRemainingMs - delta);
    this.bossShockwaveRemainingMs = Math.max(0, this.bossShockwaveRemainingMs - delta);
    if (this.hasBoss && this.bossHp > 0 && this.bossHp <= this.bossMaxHp / 2 && activeStates.has(this.state)) {
      this.bossRageElapsedMs += delta;
      if (this.bossRageElapsedMs >= 5000) {
        this.bossRageElapsedMs -= 5000;
        this.triggerBossShockwave();
      }
    }
    if (this.bonusChallengeStatus === 'running' && activeStates.has(this.state)) {
      this.bonusChallengeElapsedMs += delta;
      if (this.bonusChallengeElapsedMs >= STAGES[this.stage].bonusChallenge.timeLimitMs) {
        this.bonusChallengeStatus = 'expired';
        this.state = 'LOST';
        this.defeatCause = 'timer';
      }
    }
    Engine.update(this.engine, delta);
    this.wakeUnsupportedObstacles();
    if (this.catsReleased) this.dropUnsupportedCats();
    for (const { body, velocity } of this.pendingVelocities.values()) {
      if (body.customData?.alive !== false) Body.setVelocity(body, velocity);
    }
    this.pendingVelocities.clear();
    this.scorePopups = this.scorePopups.filter((popup) => popup.expiresAtMs > this.engine.timing.timestamp);
    this.bossDamagePopups = this.bossDamagePopups.filter((popup) => popup.expiresAtMs > this.engine.timing.timestamp);
    this.advanceGimmicks(delta);
    this.applyConveyors(delta);
    this.refreshFlowerLauncherContacts();
    this.applyFans();
    for (const body of this.bodies.values()) {
      if (body.customData?.expiresAtMs !== undefined && body.customData.expiresAtMs <= this.engine.timing.timestamp) {
        this.removeBody(body);
        continue;
      }
      if (body.label === 'enemy' && (body.position.y > WORLD.height + 60 || body.position.x > WORLD.width + 150)) {
        if (body.customData?.boss && (body.customData.hp ?? 0) > 0) {
          Body.setPosition(body, {
            x: clamp(body.position.x, 50, WORLD.width - 50),
            y: clamp(body.position.y, 80, WORLD.height - (body.customData.radius ?? 38) - 50),
          });
          Body.setVelocity(body, { x: 0, y: 0 });
        } else {
          this.defeatCat(body, { source: 'fall', point: { ...body.position }, direction: { x: 1, y: 0 }, frontal: false });
        }
      }
    }
    if (activeStates.has(this.state) && this.areAllCatsDefeated()) this.completeStage();
    else this.checkTurnSettlement();
    this.publish();
  }

  getSnapshot(): GameSnapshot {
    return this.snapshot;
  }

  private get bossRole(): 'mid' | 'final' | null {
    return STAGES[this.stage].bossRole ?? null;
  }

  private get hasBoss(): boolean {
    return this.bossRole !== null;
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
    this.bossHp = 0;
    this.bossMaxHp = 0;
    this.bossHitRemainingMs = 0;
    this.bossRageElapsedMs = 0;
    this.bossShockwaveRemainingMs = 0;
    this.bossDamagePopups = [];
    this.skillCooldownRemainingMs = 0;
    this.megaNext = false;
    this.boosterNext = false;
    this.quakeNext = false;
    this.ammo = STAGES[stage].ammo;
    if (STAGES[stage].bossRole === 'final') this.finalRewardClaimed = false;
    this.stageStars = 0;
    this.bonusChallengeElapsedMs = 0;
    this.bonusChallengeStatus = 'ready';
    this.targetingItem = null;
    this.slickZones = [];
    this.scorePopups = [];
    this.aimPosition = null;
    this.settleFrames = 0;
    this.winElapsedMs = 0;
    this.defeatCause = null;
    this.stateBeforePause = null;
    this.catsReleased = false;
    this.state = 'DIALOGUE';

    const ground = Bodies.rectangle(640, 695, 2560, 50, { isStatic: true, label: 'ground' }) as GameBody;
    const wall = Bodies.rectangle(-20, 360, 40, 1440, { isStatic: true, label: 'wall' }) as GameBody;
    Composite.add(this.engine.world, [ground, wall]);
    STAGES[stage].spawns.forEach((spawn) => this.spawn(spawn, true));
  }

  private spawn(spec: SpawnSpec, freezeForOpening = false): void {
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
    } else if (spec.kind === 'seesaw') {
      const width = positive(spec.w, 180);
      const height = positive(spec.h, 14);
      body = Bodies.rectangle(spec.x, spec.y, width, height, {
        isStatic: true,
        density: 0.004,
        friction: 0.72,
        restitution: 0.22,
        label: 'seesaw',
      }) as GameBody;
      const pivot = Constraint.create({
        pointA: { x: spec.x, y: spec.y + height },
        bodyB: body,
        pointB: { x: 0, y: height / 2 },
        length: 0,
        stiffness: 0.92,
        damping: 0.04,
      });
      Composite.add(this.engine.world, pivot);
      customData = { width, height, alive: true, seesawTriggered: false };
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
    } else if (spec.kind === 'trapdoor') {
      const width = positive(spec.w, 120);
      const height = positive(spec.h, 16);
      const anchor = spec.anchor && Number.isFinite(spec.anchor.x) && Number.isFinite(spec.anchor.y)
        ? { ...spec.anchor } : { x: spec.x - width / 2, y: spec.y };
      body = Bodies.rectangle(spec.x, spec.y, width, height, { isStatic: true, friction: 0.7, label: 'trapdoor' }) as GameBody;
      customData = { width, height, anchor, triggerImpact: positive(spec.triggerImpact, 5), initialAngle: body.angle, direction: 1, triggered: false, alive: true };
    } else if (spec.kind === 'clockHand') {
      const width = positive(spec.w, 180);
      const height = positive(spec.h, 18);
      const anchor = spec.anchor && Number.isFinite(spec.anchor.x) && Number.isFinite(spec.anchor.y)
        ? { ...spec.anchor } : { x: spec.x - width / 2, y: spec.y };
      const angularSpeed = Number.isFinite(spec.angularSpeed) ? spec.angularSpeed! : 0.45;
      body = Bodies.rectangle(spec.x, spec.y, width, height, { isStatic: true, friction: 0.45, label: 'clockHand' }) as GameBody;
      customData = {
        width, height, anchor, angularSpeed, initialAngle: body.angle,
        pivotOffset: { x: spec.x - anchor.x, y: spec.y - anchor.y }, alive: true,
      };
    } else if (spec.kind === 'conveyor') {
      const width = positive(spec.w, 180);
      const height = positive(spec.h, 18);
      body = Bodies.rectangle(spec.x, spec.y, width, height, { isStatic: true, friction: 0.9, label: 'conveyor' }) as GameBody;
      customData = { width, height, forceX: Number.isFinite(spec.forceX) ? spec.forceX : 8, alive: true };
    } else if (spec.kind === 'flowerLauncher') {
      const radius = positive(spec.radius, 30);
      body = Bodies.circle(spec.x, spec.y, radius, { isStatic: true, isSensor: true, label: 'flowerLauncher' }) as GameBody;
      customData = { radius, forceY: positive(spec.forceY, 8), alive: true };
    } else {
      const radius = positive(spec.radius, 30);
      body = Bodies.circle(spec.x, spec.y, radius, {
        isStatic: Boolean(spec.armed),
        density: 0.015,
        friction: 0.05,
        restitution: 0.1,
        label: 'boulder',
      }) as GameBody;
      customData = { radius, alive: true, armed: Boolean(spec.armed) };
    }
    this.track(body, customData);
    Composite.add(this.engine.world, body);
    if (freezeForOpening && !body.isStatic && ['block', 'tnt', 'hostageEgg', 'boulder'].includes(body.label)) {
      customData.stageFrozen = true;
      Body.setStatic(body, true);
    }
    if (spec.kind === 'cat' && customData.boss) {
      this.bossHp = customData.hp ?? BOSS_MAX_HP;
      this.bossMaxHp = customData.maxHp ?? this.bossHp;
    }
    if (spec.kind === 'chandelier' && this.bossRole === 'final') {
      const anchor = customData.anchor ?? { x: body.position.x, y: body.position.y - 140 };
      const ropeLength = Math.hypot(body.position.x - anchor.x, body.position.y - anchor.y);
      const rope = Bodies.rectangle((body.position.x + anchor.x) / 2, (body.position.y + anchor.y) / 2, 8, ropeLength, {
        isStatic: true, isSensor: true, label: 'chandelierRope',
      }) as GameBody;
      this.track(rope, { chandelierId: body.id, alive: true });
      customData.ropeId = rope.id;
      Composite.add(this.engine.world, rope);
    }
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
    const ropeId = body.customData?.ropeId;
    if (ropeId !== undefined) {
      const ropeBody = this.bodies.get(ropeId);
      if (ropeBody) {
        Composite.remove(this.engine.world, ropeBody);
        this.bodies.delete(ropeId);
      }
      if (body.customData) body.customData.ropeId = undefined;
    }
  }

  private startBossChandelierSwing(chandelier: GameBody, chick: GameBody): void {
    const data = chandelier.customData;
    if (!data?.attached || data.weakpointArmed) return;
    data.weakpointArmed = true;
    const direction = chick.position.x <= chandelier.position.x ? 1 : -1;
    const speed = Math.min(19, Math.max(12, Math.abs(chick.velocity.x) * 0.65));
    Body.setVelocity(chandelier, { x: direction * speed, y: Math.min(-2, chandelier.velocity.y) });
    Body.setAngularVelocity(chandelier, direction * 0.14);
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
      this.handleRegionalGimmickCollision(a, b, collision);
      const involvesChick = a.label === 'chick' || b.label === 'chick';
      const rope = a.label === 'chandelierRope' ? a : b.label === 'chandelierRope' ? b : null;
      if (rope) {
        const chick = a.label === 'chick' ? a : b.label === 'chick' ? b : null;
        const chandelier = rope.customData?.chandelierId !== undefined
          ? this.bodies.get(rope.customData.chandelierId) : undefined;
        if (chick && chandelier && this.bossRole === 'final') this.startBossChandelierSwing(chandelier, chick);
        if (chick) this.releaseCats();
        continue;
      }
      if (!this.catsReleased && !involvesChick) continue;
      const seesaw = a.label === 'seesaw' ? a : b.label === 'seesaw' ? b : null;
      const chickAtSeesaw = seesaw && involvesChick ? (a.label === 'chick' ? a : b) : null;
      if (seesaw && chickAtSeesaw && !seesaw.customData?.seesawTriggered) {
        seesaw.customData!.seesawTriggered = true;
        const launchesRight = chickAtSeesaw.position.x <= seesaw.position.x;
        if (seesaw.isStatic) Body.setStatic(seesaw, false);
        Body.setAngularVelocity(seesaw, launchesRight ? -0.24 : 0.24);
        const ball = [...this.bodies.values()].find((candidate) => candidate.label === 'boulder' &&
          Math.abs(candidate.position.x - seesaw.position.x) <= (seesaw.customData?.width ?? 180) * 0.6 &&
          Math.abs(candidate.position.y - seesaw.position.y) <= 70);
        if (ball) {
          if (ball.isStatic) Body.setStatic(ball, false);
          if (ball.customData) ball.customData.armed = false;
          Body.setVelocity(ball, { x: launchesRight ? 5.2 : -5.2, y: -18 });
          Body.setAngularVelocity(ball, launchesRight ? 0.18 : -0.18);
        }
      }
      if (involvesChick && [a.label, b.label].some((label) =>
        ['block', 'tnt', 'enemy', 'tire', 'gear', 'shutter', 'bouncePad', 'boulder', 'seesaw', 'chandelier', 'chandelierRope', 'trapdoor', 'clockHand', 'conveyor', 'flowerLauncher'].includes(label))) {
        this.releaseCats();
      }
      if (a.label === 'clockHand' || b.label === 'clockHand' || a.label === 'conveyor' || b.label === 'conveyor' ||
        a.label === 'flowerLauncher' || b.label === 'flowerLauncher') continue;
      const chandelier = a.label === 'chandelier' ? a : b.label === 'chandelier' ? b : null;
      const fortTarget = chandelier === a ? b : chandelier === b ? a : null;
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
      const impact = relativeSpeed * 4.5 * multiplier;
      const contact = collision?.supports?.[0];
      const point = contact && Number.isFinite(contact.x) && Number.isFinite(contact.y)
        ? { x: contact.x, y: contact.y }
        : { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 };
      if (this.bossRole === 'final' && chandelier?.customData?.weakpointArmed && !chandelier.customData.weakpointHit && fortTarget) {
        const hitsBoss = fortTarget.label === 'enemy' && fortTarget.customData?.boss;
        const hitsFortress = (fortTarget.label === 'block' || fortTarget.label === 'tnt') &&
          fortTarget.position.x >= 850 && fortTarget.position.x <= 1100 && fortTarget.position.y <= 570;
        if (hitsBoss || hitsFortress) {
          chandelier.customData.weakpointHit = true;
          this.detachChandelier(chandelier);
          const boss = [...this.bodies.values()].find((candidate) => candidate.customData?.boss && candidate.customData.alive !== false);
          if (boss) this.damageBody(boss, 250, {
            source: 'chandelier', point, direction: { x: 1, y: 0 }, frontal: false, bypassEnvironmentalCap: true,
          });
          this.awardScore(800, point.x, point.y - 20, '약점 명중');
        }
      }
      for (const body of [a, b]) {
        const data = body.customData;
        if (!data || data.alive === false) continue;
        const other = body === a ? b : a;
        const dx = body.position.x - other.position.x;
        const dy = body.position.y - other.position.y;
        const distance = Math.hypot(dx, dy);
        const source: DamageSource = other.label === 'chick' ? 'chick'
          : other.label === 'block' || other.label === 'tnt' || other.label === 'boulder' || other.label === 'seesaw' ? 'block'
            : other.label === 'chandelier' ? 'chandelier' : 'other';
        const context: DamageContext = {
          source, point,
          direction: distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 },
          frontal: other.label === 'chick' && other.position.x < body.position.x - 5 &&
            !(other.position.y < body.position.y - 15 && Math.abs(other.velocity.y) > 3),
        };
        if (body.label === 'chandelier' && relativeSpeed * 3.5 >= (data.breakImpact ?? 18)) {
          if (this.bossRole === 'final' && other.label === 'chick' && data.attached && !data.weakpointArmed) {
            this.startBossChandelierSwing(body, other);
          } else if (!(this.bossRole === 'final' && data.weakpointArmed && !data.weakpointHit)) {
            this.detachChandelier(body);
          }
        }
        if (body.label === 'enemy' && data.boss && other.label === 'chandelier' && other.customData?.weakpointHit) continue;
        if (body.label === 'enemy') {
          const damage = source === 'chick' ? impact : this.calculateDebrisDamage(body, other);
          if (source === 'chick' && context.frontal && impact > 4.5 && (data.shieldLayers ?? 0) > 0) {
            this.consumeCatShield(body);
            Body.setVelocity(other, { x: -Math.abs(other.velocity.x) * 0.7, y: -4 });
          } else if (damage > 0) {
            this.damageBody(body, damage, context);
          }
        } else if (body.label === 'hostageEgg') {
          this.damageBody(body, impact > 3.2 ? impact : 0, context);
        } else if ((body.label === 'block' || body.label === 'tnt') && impact > 5) {
          this.damageBody(body, impact, context);
        }
      }
    }
  }

  private calculateDebrisDamage(target: GameBody, source: GameBody): number {
    const dx = target.position.x - source.position.x;
    const dy = target.position.y - source.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0) return 0;
    const nx = dx / distance;
    const ny = dy / distance;
    const closingSpeed = Math.max(0,
      -((target.velocity.x - source.velocity.x) * nx + (target.velocity.y - source.velocity.y) * ny));
    if (closingSpeed <= 0) return 0;

    const targetMass = target.isStatic ? 0 : target.mass;
    const sourceMass = source.isStatic ? 0 : source.mass;
    if (targetMass <= 0 && sourceMass <= 0) return 0;
    const effectiveMass = targetMass <= 0 ? sourceMass
      : sourceMass <= 0 ? targetMass
        : (targetMass * sourceMass) / (targetMass + sourceMass);
    const impactEnergy = 0.5 * effectiveMass * closingSpeed ** 2;
    return Math.min(ENVIRONMENTAL_IMPACT_MAX_DAMAGE,
      Math.max(0, impactEnergy - ENVIRONMENTAL_IMPACT_MIN_ENERGY) * ENVIRONMENTAL_IMPACT_DAMAGE_PER_ENERGY);
  }

  private consumeCatShield(body: GameBody): void {
    const data = body.customData;
    if (!data) return;
    const layers = Math.max(0, (data.shieldLayers ?? 0) - 1);
    data.shieldLayers = layers;
    data.shield = layers > 0;
    if (layers === 0) data.shieldBroken = true;
    this.awardScore(500, body.position.x, body.position.y - 30, '방패 파괴');
  }

  private capEnvironmentalCatDamage(body: GameBody, amount: number): number {
    const data = body.customData;
    if (!data || amount <= 0) return 0;
    const now = this.engine.timing.timestamp;
    if (data.environmentalDamageWindowStartMs === undefined ||
      now - data.environmentalDamageWindowStartMs >= ENVIRONMENTAL_DAMAGE_WINDOW_MS) {
      data.environmentalDamageWindowStartMs = now;
      data.environmentalDamageInWindow = 0;
    }
    const remaining = Math.max(0, ENVIRONMENTAL_DAMAGE_WINDOW_CAP - (data.environmentalDamageInWindow ?? 0));
    const applied = Math.min(amount, remaining);
    data.environmentalDamageInWindow = (data.environmentalDamageInWindow ?? 0) + applied;
    return applied;
  }

  private damageBody(body: GameBody, amount: number, context: DamageContext): void {
    const data = body.customData;
    if (!data || data.alive === false || data.hp === undefined) return;
    if (body.label === 'enemy' && !context.bypassEnvironmentalCap && context.source !== 'chick' && (data.shieldLayers ?? 0) > 0 && amount > 0) {
      this.consumeCatShield(body);
      return;
    }
    const cappedAmount = body.label === 'enemy' && !context.bypassEnvironmentalCap && context.source !== 'chick'
      ? this.capEnvironmentalCatDamage(body, amount)
      : amount;
    const damage = Math.min(data.hp, Math.max(0, cappedAmount));
    data.hp = Math.max(0, data.hp - damage);
    if (data.boss) {
      this.bossHp = data.hp;
      this.bossHitRemainingMs = 200;
      if (damage > 0) this.bossDamagePopups.push({
        id: ++this.nextScorePopupId,
        x: body.position.x,
        y: body.position.y - (data.radius ?? 38) - 16,
        damage: Math.round(damage),
        expiresAtMs: this.engine.timing.timestamp + 1050,
      });
    }
    if (body.label === 'hostageEgg') {
      if (data.hp <= 0 || body.position.y > 685) {
        if (this.stage >= 4 && this.eggCushionActive) {
          this.eggCushionActive = false;
          data.hp = data.maxHp ?? 8.5;
          Body.setPosition(body, { x: body.position.x, y: Math.min(body.position.y, 660) });
          Body.setVelocity(body, { x: 0, y: 0 });
          return;
        }
        data.alive = false;
        if (this.eggCushionActive) this.eggCushionActive = false;
        else if (this.stage >= 4) {
          this.state = 'LOST';
          this.defeatCause = 'hostage';
        } else this.applyStagePenalty(500, body.position.x, body.position.y, 'egg broken');
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
    if (data.boss && (data.hp ?? 0) > 0) return;
    data.alive = false;
    const reward = data.boss ? 3000 : data.shield || data.shieldBroken ? 2000 : 1200;
    this.awardScore(reward, body.position.x, body.position.y - 24, data.boss ? '보스 격파' : '고양이 격파');
    this.removeBody(body);
  }

  private releaseCats(): void {
    if (this.catsReleased) return;
    this.catsReleased = true;
    for (const body of this.bodies.values()) {
      if (body.customData?.stageFrozen) {
        body.customData.stageFrozen = false;
        Body.setStatic(body, false);
        Sleeping.set(body, false);
      }
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
    this.dropCatsSupportedBy(body);
    this.removeBody(body);
    if (body.label === 'tnt') this.explode(body.position.x, body.position.y, 230, 0.14);
    else this.awardScore(180, body.position.x, body.position.y, '파괴');
  }

  private dropCatsSupportedBy(block: GameBody): void {
    const blockTop = block.position.y - (block.customData?.height ?? 20) / 2;
    const halfWidth = (block.customData?.width ?? 20) / 2;
    for (const cat of this.bodies.values()) {
      if (cat.label !== 'enemy' || cat.customData?.alive === false) continue;
      const radius = cat.customData?.radius ?? 22;
      const catBottom = cat.position.y + radius;
      const horizontalOverlap = Math.abs(cat.position.x - block.position.x) <= halfWidth + radius * 0.65;
      const restingOnBlock = horizontalOverlap && Math.abs(catBottom - blockTop) <= radius * 0.6;
      if (!restingOnBlock) continue;
      if (cat.isStatic) Body.setStatic(cat, false);
      Sleeping.set(cat, false);
      Body.setVelocity(cat, { x: cat.velocity.x, y: Math.max(cat.velocity.y, 2.2) });
    }
  }

  private dropUnsupportedCats(): void {
    const bodies = Composite.allBodies(this.engine.world) as GameBody[];
    const supports = bodies.filter((body) => ['ground', 'block', 'tnt', 'shutter', 'bouncePad', 'boulder', 'tire', 'gear', 'seesaw', 'chandelier'].includes(body.label));
    for (const cat of this.bodies.values()) {
      if (cat.label !== 'enemy' || cat.customData?.alive === false || (!cat.isStatic && !cat.isSleeping)) continue;
      const radius = cat.customData?.radius ?? 22;
      const bottom = cat.bounds.max.y;
      const supported = supports.some((support) => support.customData?.alive !== false &&
        cat.bounds.max.x > support.bounds.min.x + 2 && cat.bounds.min.x < support.bounds.max.x - 2 &&
        Math.abs(bottom - support.bounds.min.y) <= Math.max(8, radius * 0.3));
      if (supported) continue;
      if (cat.isStatic) Body.setStatic(cat, false);
      Sleeping.set(cat, false);
      Body.setVelocity(cat, { x: cat.velocity.x, y: Math.max(cat.velocity.y, 2.2) });
    }
  }

  private wakeUnsupportedObstacles(): void {
    const bodies = Composite.allBodies(this.engine.world) as GameBody[];
    const supports = bodies.filter((body) => ['ground', 'block', 'tnt', 'shutter', 'bouncePad', 'boulder', 'tire', 'gear', 'seesaw'].includes(body.label));
    for (const body of bodies) {
      if (body.isStatic || !body.isSleeping || body.label === 'chick' || body.label === 'enemy' || body.label === 'seesaw' || body.label === 'chandelierRope') continue;
      const resting = supports.some((support) => support !== body && support.customData?.alive !== false &&
        body.bounds.max.x > support.bounds.min.x + 2 && body.bounds.min.x < support.bounds.max.x - 2 &&
        Math.abs(body.bounds.max.y - support.bounds.min.y) <= 7);
      if (!resting) Sleeping.set(body, false);
    }
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
          this.damageBody(body, body.label === 'enemy' ? power * 8 : power * 50, {
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
      if (body.label === 'clockHand' && data?.anchor && data.pivotOffset) {
        const angle = body.angle + (data.angularSpeed ?? 0.45) * deltaMs / 1000;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        Body.setPosition(body, {
          x: data.anchor.x + data.pivotOffset.x * cosine - data.pivotOffset.y * sine,
          y: data.anchor.y + data.pivotOffset.x * sine + data.pivotOffset.y * cosine,
        });
        Body.setAngle(body, angle);
        continue;
      }
      if (body.label === 'trapdoor' && data?.triggered && data.initialAngle !== undefined) {
        const limit = 85 * Math.PI / 180;
        const direction = data.direction ?? 1;
        if ((body.angle - data.initialAngle) * direction >= limit) {
          Body.setAngle(body, data.initialAngle + direction * limit);
          Body.setAngularVelocity(body, 0);
        }
        continue;
      }
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

  private handleRegionalGimmickCollision(a: GameBody, b: GameBody, collision: Matter.Collision | null): void {
    const trapdoor = a.label === 'trapdoor' ? a : b.label === 'trapdoor' ? b : null;
    const flowerLauncher = a.label === 'flowerLauncher' ? a : b.label === 'flowerLauncher' ? b : null;
    const gimmick = trapdoor ?? flowerLauncher;
    if (!gimmick) return;
    const dynamic = gimmick === a ? b : a;
    if (dynamic.isStatic || dynamic.customData?.alive === false) return;
    if (trapdoor && !trapdoor.customData?.triggered) {
      const normal = collision?.normal;
      const relativeX = b.velocity.x - a.velocity.x;
      const relativeY = b.velocity.y - a.velocity.y;
      const impactSpeed = normal
        ? Math.abs(relativeX * normal.x + relativeY * normal.y)
        : Math.hypot(relativeX, relativeY);
      if (impactSpeed < (trapdoor.customData?.triggerImpact ?? 5)) return;
      const data = trapdoor.customData!;
      data.triggered = true;
      const anchor = data.anchor ?? { x: trapdoor.position.x - (data.width ?? 120) / 2, y: trapdoor.position.y };
      data.direction = anchor.x <= trapdoor.position.x ? 1 : -1;
      data.initialAngle = trapdoor.angle;
      Body.setStatic(trapdoor, false);
      const hinge = Constraint.create({
        pointA: anchor,
        bodyB: trapdoor,
        pointB: { x: anchor.x - trapdoor.position.x, y: anchor.y - trapdoor.position.y },
        length: 0,
        stiffness: 0.95,
        damping: 0.08,
      });
      Composite.add(this.engine.world, hinge);
      return;
    }
    if (flowerLauncher && dynamic.customData?.spent) return;
    if (flowerLauncher) {
      const dx = dynamic.position.x - flowerLauncher.position.x;
      const dy = dynamic.position.y - flowerLauncher.position.y;
      const distance = Math.hypot(dx, dy) || 1;
      const normalY = dy / distance;
      const descending = dynamic.velocity.y >= -1;
      const topContact = dynamic.position.y < flowerLauncher.position.y && normalY <= -0.55;
      if (!descending || !topContact) return;
      dynamic.customData ??= { alive: true };
      dynamic.customData.spent = true;
      dynamic.customData.flowerLauncherId = flowerLauncher.id;
      Body.setVelocity(dynamic, { x: dynamic.velocity.x, y: -Math.abs(flowerLauncher.customData?.forceY ?? 8) });
    }
  }

  private applyConveyors(deltaMs: number): void {
    const conveyors = [...this.bodies.values()].filter((body) => body.label === 'conveyor' && body.customData?.alive !== false);
    if (!conveyors.length) return;
    const deltaSeconds = deltaMs / 1000;
    for (const body of Composite.allBodies(this.engine.world) as GameBody[]) {
      if (body.isStatic || body.isSensor || body.customData?.alive === false) continue;
      for (const conveyor of conveyors) {
        if (!Query.collides(body, [conveyor]).length || body.position.y >= conveyor.position.y ||
          body.bounds.max.y > conveyor.bounds.min.y + 8) continue;
        const forceX = conveyor.customData?.forceX ?? 8;
        Body.setVelocity(body, { x: clamp(body.velocity.x + forceX * deltaSeconds, -11.999, 11.999), y: body.velocity.y });
        break;
      }
    }
  }

  private refreshFlowerLauncherContacts(): void {
    const launchers = [...this.bodies.values()].filter((body) => body.label === 'flowerLauncher');
    if (!launchers.length) return;
    for (const body of Composite.allBodies(this.engine.world) as GameBody[]) {
      const data = body.customData;
      if (!data?.spent || data.flowerLauncherId === undefined) continue;
      const launcher = launchers.find((candidate) => candidate.id === data.flowerLauncherId);
      if (!launcher || !Query.collides(body, [launcher]).length) {
        data.spent = false;
        data.flowerLauncherId = undefined;
      }
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

  private triggerBossShockwave(): void {
    this.bossShockwaveRemainingMs = 900;
    const chick = this.activeChick;
    if (this.state !== 'FLYING' || !chick || chick.position.x > 1000) return;
    Body.setVelocity(chick, { x: chick.velocity.x * 0.62, y: chick.velocity.y * 0.72 });
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

    if (this.areAllCatsDefeated()) {
      this.completeStage();
    } else if (this.ammo <= 0) {
      this.state = 'LOST';
      this.defeatCause = 'ammo';
    } else {
      if (chick) {
        this.removeBody(chick);
      }
      this.activeChick = null;
      this.aimPosition = null;
      this.state = 'AIMING';
    }
    this.settleFrames = 0;
  }

  private areAllCatsDefeated(): boolean {
    const catsAlive = [...this.bodies.values()].some(
      (body) => body.label === 'enemy' && body.customData?.alive !== false && body.position.y < WORLD.height + 20,
    );
    return !catsAlive && (!this.hasBoss || this.bossHp <= 0);
  }

  private completeStage(): void {
    const finalBoss = this.bossRole === 'final';
    this.state = finalBoss ? 'WON' : 'EVOLUTION';
    this.stageStars = this.calculateStageStars();
    if (this.bonusChallengeStatus === 'running' && this.bonusChallengeElapsedMs <= STAGES[this.stage].bonusChallenge.timeLimitMs) {
      this.bonusChallengeStatus = 'success';
      this.awardScore(STAGES[this.stage].bonusChallenge.bonusScore, 640, 120, '시간 도전 성공');
    } else if (this.bonusChallengeStatus === 'running') {
      this.bonusChallengeStatus = 'expired';
    }
    this.winElapsedMs = 0;
    this.settleFrames = 0;
    if (!finalBoss) {
      const reward = STAGE_CLEAR_REWARDS[this.stage];
      if (reward) this.grantItem(reward);
    }
  }

  private advanceStageClear(delta: number): void {
    if (this.bossRole !== 'final') {
      const reward = STAGE_CLEAR_REWARDS[this.stage];
      if (reward) this.grantItem(reward);
      this.state = 'EVOLUTION';
      return;
    }
    this.winElapsedMs += delta;
    if (this.winElapsedMs < FINAL_BOSS_VICTORY_DISPLAY_MS) return;
    this.finalRewardClaimed = false;
    this.state = 'ENDING';
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
      if (!['block', 'tnt', 'enemy', 'hostageEgg', 'shutter', 'bouncePad', 'boulder', 'seesaw', 'chick', 'tire', 'gear', 'chandelier', 'trapdoor', 'clockHand', 'conveyor', 'flowerLauncher'].includes(body.label)) continue;
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
        customData: data ? {
          triggered: data.triggered,
          spent: data.spent,
          direction: data.direction === 1 || data.direction === -1 ? data.direction : undefined,
        } : undefined,
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
      bossHp: this.hasBoss ? this.bossHp : 0,
      bossMaxHp: this.hasBoss ? this.bossMaxHp : 0,
      bossHitRemainingMs: this.bossHitRemainingMs,
      bossShockwaveRemainingMs: this.bossShockwaveRemainingMs,
      bossDamagePopups: this.bossDamagePopups.map((popup) => ({
        id: popup.id,
        x: popup.x,
        y: popup.y,
        damage: popup.damage,
        remainingMs: Math.max(0, popup.expiresAtMs - this.engine.timing.timestamp),
      })),
      winElapsedMs: this.winElapsedMs,
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
      megaNext: this.megaNext,
      boosterNext: this.boosterNext,
      quakeNext: this.quakeNext,
      skillCooldownRemainingMs: this.skillCooldownRemainingMs,
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
