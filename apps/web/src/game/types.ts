export type GameStage = 1 | 2 | 3 | 4;

export type GameScreen = 'home' | 'game' | 'leaderboard';

export type GameState =
  | 'DIALOGUE'
  | 'AIMING'
  | 'FLYING'
  | 'RESOLVING'
  | 'WON'
  | 'LOST'
  | 'EVOLUTION'
  | 'ENDING';

export type BlockKind = 'wood' | 'stone' | 'glass' | 'tnt';
export type GimmickKind = 'fan' | 'trampoline' | 'boulder' | 'shutter';
export type ItemKind = 'booster' | 'quake' | 'mega';

export interface Point {
  x: number;
  y: number;
}

export interface ChickForm {
  stage: GameStage;
  name: string;
  avatar: string;
  radius: number;
  density: number;
  skillName: string;
  skillDesc: string;
  bannerTip: string;
}

export interface SpawnSpec {
  kind: 'block' | 'cat' | 'egg' | 'shutter' | 'fan' | 'trampoline' | 'boulder';
  x: number;
  y: number;
  w?: number;
  h?: number;
  radius?: number;
  material?: BlockKind;
  boss?: boolean;
  shield?: boolean;
  minY?: number;
  maxY?: number;
  speed?: number;
  forceX?: number;
  forceY?: number;
}

export interface StageDefinition {
  stage: GameStage;
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
