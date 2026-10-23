export type GameStage = 1 | 2 | 3 | 4 | 5 | 6;
export type ChickFormId = 'baby' | 'breeze' | 'fighter' | 'golden';
export type SkillKind = 'shell' | 'boost' | 'meteor' | 'feathers';
export type SceneTheme = 'alley-day' | 'wall-afternoon' | 'rooftop-sunset' | 'clock-twilight' | 'factory-night' | 'meadow-gold';

export type GameScreen = 'home' | 'game' | 'leaderboard';

export type GameState =
  | 'DIALOGUE'
  | 'AIMING'
  | 'FLYING'
  | 'RESOLVING'
  | 'PAUSED'
  | 'WON'
  | 'LOST'
  | 'EVOLUTION'
  | 'ENDING';

export type BlockKind = 'wood' | 'stone' | 'glass' | 'steel' | 'rubber' | 'tnt';
export type GimmickKind = 'fan' | 'trampoline' | 'boulder' | 'shutter' | 'tire' | 'gear' | 'chandelier';
export type ItemKind = 'booster' | 'quake' | 'mega' | 'butter' | 'cushion';

export interface SlickZone { id: number; x: number; width: number; }
export interface ScorePopup { id: number; x: number; y: number; value: number; label?: string; remainingMs: number; }

export interface Point {
  x: number;
  y: number;
}

export interface ChickForm {
  stage: GameStage;
  formId: ChickFormId;
  skillKind: SkillKind;
  launchPower: number;
  damageMultiplier: number;
  assetVariant: 1 | 2 | 3 | 4;
  name: string;
  avatar: string;
  radius: number;
  density: number;
  skillName: string;
  skillDesc: string;
  bannerTip: string;
}

export interface SpawnSpec {
  kind: 'block' | 'cat' | 'egg' | GimmickKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  radius?: number;
  material?: BlockKind;
  boss?: boolean;
  shield?: boolean;
  hp?: number;
  shieldLayers?: number;
  anchor?: Point;
  angularSpeed?: number;
  breakImpact?: number;
  minY?: number;
  maxY?: number;
  speed?: number;
  forceX?: number;
  forceY?: number;
}

export interface AttackRoute {
  name: string;
  hint: string;
  target: Point;
}

export interface StageDefinition {
  stage: GameStage;
  theme: SceneTheme;
  title: string;
  ammo: number;
  bonusChallenge: { timeLimitMs: number; bonusScore: number; badge: string };
  attackRoutes: readonly [AttackRoute, AttackRoute];
  story: {
    speaker: string;
    avatar: string;
    text: string;
    chickReply: string;
    instruction: string;
  };
  spawns: readonly SpawnSpec[];
}

export interface GameEntityView {
  id: number;
  kind: SpawnSpec['kind'] | 'chick';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  angle: number;
  hp?: number;
  maxHp?: number;
  material?: BlockKind;
  boss?: boolean;
  shield?: boolean;
  shieldLayers?: number;
  anchor?: Point;
  attached?: boolean;
  angularSpeed?: number;
  projectile?: 'shell' | 'feather';
  expiresAtMs?: number;
  slick?: boolean;
  alive: boolean;
}

export type ItemCounts = Readonly<Record<ItemKind, number>>;

export interface GameSnapshot {
  screen: GameScreen;
  stage: GameStage;
  /** Campaign total. Replay points are excluded. */
  score: number;
  stageScore: number;
  scoreTarget: number;
  stageAmmo: number;
  stageStars: 0 | 1 | 2 | 3;
  bonusChallengeRemainingMs: number;
  bonusChallengeStatus: 'ready' | 'running' | 'expired' | 'success';
  ammo: number;
  campaignComplete: boolean;
  state: GameState;
  items: ItemCounts;
  eggCushionActive: boolean;
  finalRewardClaimed: boolean;
  targetingItem: 'butter' | null;
  slickZones: readonly SlickZone[];
  scorePopups?: readonly ScorePopup[];
  muted: boolean;
  entities: readonly GameEntityView[];
  aimPosition: Point | null;
  megaNext: boolean;
  defeatCause: 'ammo' | 'hostage' | 'timer' | null;
  story: StageDefinition['story'];
  form: ChickForm;
  evolvedForm: ChickForm | null;
}
