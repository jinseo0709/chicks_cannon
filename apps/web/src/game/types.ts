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

export type BlockKind = 'wood' | 'stone' | 'glass' | 'tnt';
export type GimmickKind = 'fan' | 'trampoline' | 'boulder' | 'shutter' | 'tire' | 'gear' | 'chandelier';
export type ItemKind = 'booster' | 'quake' | 'mega';

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

export interface StageDefinition {
  stage: GameStage;
  theme: SceneTheme;
  title: string;
  ammo: number;
  story: {
    speaker: string;
    avatar: string;
    text: string;
    chickReply: string;
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
  alive: boolean;
}

export type ItemCounts = Readonly<Record<ItemKind, number>>;

export interface GameSnapshot {
  screen: GameScreen;
  stage: GameStage;
  score: number;
  ammo: number;
  campaignComplete: boolean;
  state: GameState;
  items: ItemCounts;
  muted: boolean;
  entities: readonly GameEntityView[];
  aimPosition: Point | null;
  defeatCause: 'ammo' | 'hostage' | null;
  story: StageDefinition['story'];
  form: ChickForm;
  evolvedForm: ChickForm | null;
}
