import type { BlockKind, ChickForm, GameStage, Point } from './types';

export const WORLD = {
  width: 1280,
  height: 720,
  cannon: { x: 160, y: 525 } satisfies Point,
  nest: { x: 360, y: 620 } satisfies Point,
  maxDrag: 125,
  gravityY: 1.05,
} as const;

export const CHICK_FORMS: Readonly<Record<GameStage, ChickForm>> = {
  1: {
    stage: 1,
    name: '아기 삐약이',
    avatar: '🐥',
    radius: 17,
    density: 0.003,
    skillName: '껍질 탄환',
    skillDesc: '비행 중 탭하면 단단한 달걀 껍질을 발사해 장애물을 깹니다!',
    bannerTip: '화면 탭: [껍질 탄환] 발사!',
  },
  2: {
    stage: 2,
    name: '중닭 질풍이',
    avatar: '🐔',
    radius: 22,
    density: 0.005,
    skillName: '질풍 부스터',
    skillDesc: '강력한 날개짓으로 전방을 향해 초고속 관통 돌진합니다!',
    bannerTip: '화면 탭: [질풍 부스터] 고속 돌진!',
  },
  3: {
    stage: 3,
    name: '성체 싸움닭',
    avatar: '🐓',
    radius: 27,
    density: 0.008,
    skillName: '메테오 급강하',
    skillDesc: '수직 급강하로 착탄 지점에 충격을 줍니다!',
    bannerTip: '화면 탭: [메테오 급강하] 수직 파쇄!',
  },
  4: {
    stage: 4,
    name: '전설의 황금닭',
    avatar: '👑🐓',
    radius: 34,
    density: 0.015,
    skillName: '황금 깃털 폭풍',
    skillDesc: '황금빛 충격파로 주변 요새와 적을 공격합니다!',
    bannerTip: '화면 탭: [황금 깃털 폭풍] 대폭발!',
  },
};

export const BLOCK_CONFIG: Readonly<
  Record<BlockKind, { fill: string; stroke: string; hp: number; density: number }>
> = {
  wood: { fill: '#b45309', stroke: '#78350f', hp: 32, density: 0.003 },
  stone: { fill: '#64748b', stroke: '#334155', hp: 75, density: 0.007 },
  glass: { fill: '#7dd3fc', stroke: '#0284c7', hp: 12, density: 0.0018 },
  tnt: { fill: '#ef4444', stroke: '#991b1b', hp: 18, density: 0.0018 },
};
