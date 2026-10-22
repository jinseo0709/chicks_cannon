import type { BlockKind, GameStage, SpawnSpec, StageDefinition } from './types';

const block = (x: number, y: number, w: number, h: number, material: BlockKind): SpawnSpec =>
  ({ kind: 'block', x, y, w, h, material });
const cat = (x: number, y: number, radius: number, shieldLayers = 0, boss = false, hp?: number): SpawnSpec =>
  ({ kind: 'cat', x, y, radius, shieldLayers, shield: shieldLayers > 0, boss, hp });

export const STAGES: Readonly<Record<GameStage, StageDefinition>> = {
  1: {
    stage: 1, title: '골목길 입구', theme: 'alley-day', ammo: 4,
    story: {
      speaker: '골목대장 길고양이', avatar: '🐱',
      text: '이 둥지는 이제 내 낮잠 자리다냥!', chickReply: '둥지를 돌려줘 삐약!',
    },
    spawns: [
      block(785, 620, 26, 100, 'wood'), block(925, 620, 26, 100, 'wood'),
      block(855, 558, 190, 22, 'wood'), cat(810, 524, 22), cat(900, 524, 22),
      block(815, 510, 24, 74, 'wood'), block(895, 510, 24, 74, 'wood'),
      block(855, 466, 122, 20, 'glass'), cat(855, 432, 22),
      block(1000, 625, 26, 90, 'wood'), block(1100, 625, 26, 90, 'wood'),
      block(1050, 574, 142, 22, 'wood'), cat(1050, 540, 22),
      block(965, 642, 44, 54, 'glass'),
    ],
  },
  2: {
    stage: 2, title: '도둑고양이 담장', theme: 'wall-afternoon', ammo: 4,
    story: {
      speaker: '담장 경비 고양이', avatar: '😼',
      text: '냄비 방패와 타이어를 넘어와 보라냥!', chickReply: '튕겨서 뒤쪽을 노릴 거야!',
    },
    spawns: [
      { kind: 'tire', x: 650, y: 630, radius: 40 },
      block(760, 620, 28, 100, 'stone'), block(890, 620, 26, 100, 'wood'),
      block(825, 558, 174, 22, 'wood'), cat(790, 523, 24), cat(860, 523, 25, 1),
      block(790, 510, 24, 74, 'wood'), block(860, 510, 24, 74, 'stone'),
      block(825, 466, 112, 20, 'glass'), cat(825, 432, 24, 1),
      block(965, 620, 28, 100, 'wood'), block(1105, 620, 28, 100, 'stone'),
      block(1035, 558, 184, 22, 'wood'), cat(1000, 523, 24), cat(1070, 523, 24, 1),
      block(1035, 514, 72, 58, 'glass'),
    ],
  },
  3: {
    stage: 3, title: '바람 부는 고층 옥상', theme: 'rooftop-sunset', ammo: 5,
    story: {
      speaker: '옥상 바람잡이', avatar: '😺',
      text: '셔터와 상승 바람을 읽을 수 있겠냥?', chickReply: '질풍 부스터로 바람을 타겠어!',
    },
    spawns: [
      { kind: 'fan', x: 470, y: 420, w: 140, h: 420, forceX: 0, forceY: -0.0015 },
      { kind: 'shutter', x: 650, y: 390, w: 24, h: 150, minY: 300, maxY: 480, speed: 2 },
      block(780, 620, 28, 100, 'stone'), block(920, 620, 28, 100, 'wood'),
      block(850, 558, 190, 22, 'stone'), cat(805, 522, 24), cat(890, 522, 24, 1),
      block(805, 505, 24, 84, 'glass'), block(890, 505, 24, 84, 'wood'),
      block(848, 454, 132, 20, 'glass'), cat(848, 420, 24, 1),
      block(985, 620, 28, 100, 'stone'), block(1120, 620, 28, 100, 'stone'),
      block(1052, 558, 182, 22, 'wood'), cat(1015, 522, 24), cat(1090, 522, 24),
      block(1018, 510, 24, 74, 'wood'), block(1088, 510, 24, 74, 'glass'),
      block(1053, 466, 112, 20, 'stone'),
    ],
  },
  4: {
    stage: 4, title: '위험천만 시계탑', theme: 'clock-twilight', ammo: 5,
    story: {
      speaker: '시계탑 집사냥', avatar: '🕰️😼',
      text: '아기 달걀까지 지킬 수 있겠냥?', chickReply: '달걀을 지키며 쇠사슬을 끊겠어!',
    },
    spawns: [
      { kind: 'gear', x: 620, y: 450, radius: 50, angularSpeed: 0.025 },
      { kind: 'chandelier', x: 780, y: 330, w: 100, h: 36, anchor: { x: 780, y: 190 } },
      block(850, 620, 30, 100, 'stone'), block(990, 620, 28, 100, 'wood'),
      block(920, 558, 190, 22, 'stone'), cat(875, 522, 24, 1),
      { kind: 'egg', x: 1190, y: 650 }, cat(970, 522, 24),
      block(875, 505, 26, 84, 'wood'), block(965, 505, 26, 84, 'stone'),
      block(920, 454, 142, 22, 'wood'), cat(920, 418, 24, 1),
      block(1040, 620, 28, 100, 'stone'), block(1140, 620, 28, 100, 'wood'),
      block(1090, 558, 140, 22, 'glass'), cat(1090, 522, 25, 1),
      block(1090, 508, 60, 76, 'glass'),
    ],
  },
  5: {
    stage: 5, title: '보스의 폐공장 벙커', theme: 'factory-night', ammo: 6,
    story: {
      speaker: '벙커 방패대장', avatar: '🛡️😾',
      text: '두 겹 방패와 TNT 벙커다냥!', chickReply: '메테오 급강하로 빈틈을 열겠어!',
    },
    spawns: [
      block(690, 646, 44, 48, 'tnt'), block(742, 646, 44, 48, 'tnt'),
      block(800, 620, 30, 100, 'stone'), block(970, 620, 30, 100, 'stone'),
      block(885, 558, 220, 24, 'stone'), cat(840, 520, 24, 2), cat(930, 520, 24, 2),
      block(830, 500, 28, 92, 'stone'), block(940, 500, 28, 92, 'wood'),
      block(885, 444, 164, 22, 'glass'), cat(885, 408, 25, 1),
      block(1030, 620, 30, 100, 'stone'), block(1160, 620, 30, 100, 'stone'),
      block(1095, 558, 178, 24, 'stone'), cat(1060, 520, 24, 2), cat(1130, 520, 24),
      block(1060, 505, 26, 82, 'wood'), block(1130, 505, 26, 82, 'wood'),
      block(1095, 456, 120, 20, 'stone'), block(1095, 424, 44, 44, 'tnt'),
    ],
  },
  6: {
    stage: 6, title: '둥지 탈환 대축제', theme: 'meadow-gold', ammo: 7,
    story: {
      speaker: '보스 고양이 킹냥이', avatar: '👑🐱',
      text: '세 겹 요새를 지키는 내가 마지막 상대다냥!', chickReply: '황금 깃털로 우리 둥지를 되찾겠어!',
    },
    spawns: [
      { kind: 'fan', x: 430, y: 425, w: 120, h: 410, forceX: 0, forceY: -0.0012 },
      { kind: 'gear', x: 540, y: 430, radius: 44, angularSpeed: -0.025 },
      { kind: 'tire', x: 590, y: 630, radius: 40 },
      { kind: 'shutter', x: 660, y: 400, w: 26, h: 150, minY: 310, maxY: 490, speed: 2.4 },
      { kind: 'chandelier', x: 810, y: 290, w: 110, h: 40, anchor: { x: 810, y: 175 } },
      block(730, 646, 44, 48, 'tnt'), block(782, 646, 44, 48, 'tnt'),
      block(850, 620, 30, 100, 'stone'), block(1080, 620, 30, 100, 'stone'),
      block(965, 558, 270, 24, 'stone'), cat(850, 522, 24, 2), cat(1080, 522, 24, 1),
      block(895, 503, 26, 86, 'wood'), block(1035, 503, 26, 86, 'wood'),
      block(965, 448, 200, 24, 'stone'), block(925, 398, 26, 76, 'stone'),
      block(1005, 398, 26, 76, 'wood'), block(965, 348, 140, 24, 'stone'),
      block(1150, 646, 44, 48, 'tnt'), block(1115, 620, 30, 100, 'glass'),
      cat(965, 298, 38, 0, true, 150), { kind: 'egg', x: 1220, y: 650 },
    ],
  },
};
