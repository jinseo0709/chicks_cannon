import type { BlockKind, ChickForm, ChickFormId, GameStage, Point } from './types';

export const WORLD = {
  width: 1280,
  height: 720,
  cannon: { x: 160, y: 525 } satisfies Point,
  nest: { x: 1205, y: 620 } satisfies Point,
  maxDrag: 125,
  cancelDragRadius: 34,
  gravityY: 1.05,
} as const;

export const STAGE_ORDER: readonly GameStage[] = [1, 2, 3, 4, 5, 6];
export const LAST_STAGE: GameStage = STAGE_ORDER[STAGE_ORDER.length - 1];
export const STAGE_SCORE_TARGETS: Readonly<Record<GameStage, number>> = {
  1: 3600,
  2: 5000,
  3: 6000,
  4: 6500,
  5: 7000,
  6: 8000,
};

const FORM_DEFINITIONS: Readonly<Record<ChickFormId, Omit<ChickForm, 'stage'>>> = {
  baby: {
    formId: 'baby',
    skillKind: 'shell',
    launchPower: 26,
    damageMultiplier: 1,
    assetVariant: 1,
    name: '아기 삐약이',
    avatar: '🐥',
    radius: 17,
    density: 0.003,
    skillName: '껍질 탄환',
    skillDesc: '비행 중 탭하면 단단한 달걀 껍질을 발사해 장애물을 깹니다!',
    bannerTip: '화면 탭: [껍질 탄환] 발사!',
  },
  breeze: {
    formId: 'breeze',
    skillKind: 'boost',
    launchPower: 26,
    damageMultiplier: 1.8,
    assetVariant: 2,
    name: '중닭 질풍이',
    avatar: '🐔',
    radius: 22,
    density: 0.005,
    skillName: '질풍 부스터',
    skillDesc: '강력한 날개짓으로 전방을 향해 초고속 관통 돌진합니다!',
    bannerTip: '화면 탭: [질풍 부스터] 고속 돌진!',
  },
  fighter: {
    formId: 'fighter',
    skillKind: 'meteor',
    launchPower: 28,
    damageMultiplier: 2.8,
    assetVariant: 3,
    name: '성체 싸움닭',
    avatar: '🐓',
    radius: 27,
    density: 0.008,
    skillName: '메테오 급강하',
    skillDesc: '수직 급강하로 착탄 지점에 충격을 줍니다!',
    bannerTip: '화면 탭: [메테오 급강하] 수직 파쇄!',
  },
  golden: {
    formId: 'golden',
    skillKind: 'feathers',
    launchPower: 31,
    damageMultiplier: 4.5,
    assetVariant: 4,
    name: '전설의 황금닭',
    avatar: '👑🐓',
    radius: 34,
    density: 0.015,
    skillName: '황금 깃털 폭풍',
    skillDesc: '황금 깃털을 전방으로 펼쳐 요새를 관통합니다!',
    bannerTip: '화면 탭: [황금 깃털 폭풍] 발사!',
  },
};

const STAGE_FORMS: Readonly<Record<GameStage, ChickFormId>> = {
  1: 'baby', 2: 'baby', 3: 'breeze', 4: 'breeze', 5: 'fighter', 6: 'golden',
};

export const CHICK_FORMS = Object.fromEntries(STAGE_ORDER.map((stage) => [
  stage, { ...FORM_DEFINITIONS[STAGE_FORMS[stage]], stage },
])) as Readonly<Record<GameStage, ChickForm>>;

export const BLOCK_CONFIG: Readonly<
  Record<BlockKind, { fill: string; stroke: string; hp: number; density: number; friction?: number; restitution?: number }>
> = {
  wood: { fill: '#ee963d', stroke: '#754226', hp: 32, density: 0.003 },
  stone: { fill: '#469bb8', stroke: '#164e68', hp: 75, density: 0.007 },
  glass: { fill: '#68d9e5', stroke: '#117d9b', hp: 12, density: 0.0018 },
  steel: { fill: '#95a6b6', stroke: '#354655', hp: 150, density: 0.012, friction: 0.72, restitution: 0.08 },
  rubber: { fill: '#cb5b72', stroke: '#6b2944', hp: 28, density: 0.0024, friction: 0.82, restitution: 0.78 },
  tnt: { fill: '#f04455', stroke: '#8c2637', hp: 18, density: 0.0018 },
};
