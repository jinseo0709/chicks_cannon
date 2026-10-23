import type { BlockKind, GameStage, SpawnSpec, StageDefinition } from './types';

const block = (x: number, y: number, w: number, h: number, material: BlockKind): SpawnSpec =>
  ({ kind: 'block', x, y, w, h, material });
const cat = (x: number, y: number, radius: number, shieldLayers = 0, boss = false, hp?: number): SpawnSpec =>
  ({ kind: 'cat', x, y, radius, shieldLayers, shield: shieldLayers > 0, boss, hp });

export const STAGES: Readonly<Record<GameStage, StageDefinition>> = {
  1: {
    stage: 1, title: '골목길 입구', theme: 'alley-day', ammo: 6, bonusChallenge: { timeLimitMs: 65000, bonusScore: 500, badge: '첫 돌파' },
    attackRoutes: [
      { name: '낮은 목재 받침', hint: '왼쪽 받침을 끊어 아래층부터 무너뜨리기', target: { x: 785, y: 620 } },
      { name: '오른쪽 유리 선반', hint: '높은 유리 선반을 깨서 위층을 떨어뜨리기', target: { x: 1050, y: 574 } },
    ],
    story: {
      speaker: '골목대장 길고양이', avatar: '🐱',
      text: '이 둥지는 이제 내 낮잠 자리다냥!', chickReply: '둥지를 돌려줘 삐약!',
      instruction: '\uB098\uBB34 \uC9C0\uC9C0\uB300\uB97C \uBB34\uB108\uB728\uB9AC\uBA74 \uC694\uC0C8\uB3C4 \uD754\uB4E4\uB824\uC694.',
    },
    spawns: [
      block(785, 620, 26, 100, 'wood'), block(925, 620, 26, 100, 'wood'),
      block(855, 558, 190, 22, 'wood'), cat(810, 524, 22), cat(900, 524, 22),
      block(815, 510, 24, 74, 'wood'), block(895, 510, 24, 74, 'wood'),
      block(855, 466, 122, 20, 'glass'), cat(855, 432, 22),
      block(710, 646, 48, 48, 'wood'), block(710, 608, 64, 18, 'glass'),
      block(1000, 625, 26, 90, 'wood'), block(1100, 625, 26, 90, 'wood'),
      block(1050, 574, 142, 22, 'wood'), cat(1050, 540, 22),
      block(965, 642, 44, 54, 'glass'),
    ],
  },
  2: {
    stage: 2, title: '도둑고양이 담장', theme: 'wall-afternoon', ammo: 6, bonusChallenge: { timeLimitMs: 75000, bonusScore: 600, badge: '방패 무력화' },
    attackRoutes: [
      { name: '왼쪽 계단 탑', hint: '계단 탑을 타고 방패 뒤쪽을 노리기', target: { x: 630, y: 570 } },
      { name: '요새 윗층', hint: '윗층 목재 받침을 끊어 방패 고양이에게 낙하시키기', target: { x: 700, y: 358 } },
    ],
    story: {
      speaker: '담장 경비 고양이', avatar: '😼',
      text: '방패 고양이를 정면에서 뚫어 보라냥!', chickReply: '튕겨서 뒤쪽을 노릴 거야!',
      instruction: '\uBC29\uD328\uB294 \uC815\uBA74 \uCDA9\uB3CC\uB85C \uD55C \uACB9\uC529 \uBCA7\uACA8 \uBCF4\uC138\uC694.',
    },
    spawns: [
      block(760, 620, 28, 100, 'stone'), block(890, 620, 26, 100, 'wood'),
      block(825, 558, 174, 22, 'wood'), cat(790, 523, 24), cat(860, 523, 25, 1),
      block(790, 510, 24, 74, 'wood'), block(860, 510, 24, 74, 'stone'),
      block(825, 466, 112, 20, 'glass'), cat(825, 432, 24, 1),
      // Three connected terraces rise into the main shield fort.
      block(560, 620, 24, 100, 'stone'), block(560, 558, 120, 20, 'wood'), cat(560, 524, 22),
      block(630, 570, 24, 200, 'steel'), block(630, 458, 120, 22, 'rubber'),
      block(700, 520, 24, 300, 'stone'), block(700, 358, 120, 22, 'wood'), cat(700, 322, 23, 1),
      block(595, 484, 18, 76, 'glass'), block(665, 414, 18, 88, 'wood'),
      block(965, 620, 28, 100, 'wood'), block(1105, 620, 28, 100, 'stone'),
      block(1035, 558, 184, 22, 'wood'), cat(1000, 523, 24), cat(1070, 523, 24, 1),
      block(1035, 514, 72, 58, 'glass'),
    ],
  },
  3: {
    stage: 3, title: '바람 부는 고층 옥상', theme: 'rooftop-sunset', ammo: 5, bonusChallenge: { timeLimitMs: 80000, bonusScore: 700, badge: '바람 타기' },
    attackRoutes: [
      { name: '선풍기 바람길', hint: '상승 바람으로 왼쪽 계단 위를 덮치기', target: { x: 470, y: 420 } },
      { name: '오른쪽 목재 지지대', hint: '오른쪽 받침을 끊어 본채를 옆으로 무너뜨리기', target: { x: 985, y: 620 } },
    ],
    story: {
      speaker: '옥상 바람잡이', avatar: '😺',
      text: '상승 바람을 읽을 수 있겠냥?', chickReply: '질풍 부스터로 바람을 타겠어!',
      instruction: '\uC120\uD48D\uAE30 \uBC14\uB78C\uC744 \uD0C0\uBA74 \uBCD1\uC544\uB9AC\uC758 \uAD34\uC801\uC774 \uBC14\uB00C\uC5B4\uC694.',
    },
    spawns: [
      { kind: 'fan', x: 490, y: 420, w: 220, h: 460, forceX: 0.001, forceY: -0.012 },
      block(780, 620, 28, 100, 'stone'), block(920, 620, 28, 100, 'wood'),
      block(850, 558, 190, 22, 'stone'), cat(805, 522, 24), cat(890, 522, 24, 1),
      block(805, 505, 24, 84, 'glass'), block(890, 505, 24, 84, 'wood'),
      block(848, 454, 132, 20, 'glass'), cat(848, 420, 24, 1),
      block(580, 620, 24, 100, 'steel'), block(580, 558, 90, 24, 'rubber'),
      block(645, 570, 24, 200, 'wood'), block(645, 458, 90, 24, 'steel'),
      block(710, 520, 24, 300, 'stone'), block(710, 358, 90, 24, 'rubber'),
      block(985, 620, 28, 100, 'stone'), block(1120, 620, 28, 100, 'stone'),
      block(1052, 558, 182, 22, 'wood'), cat(1015, 522, 24), cat(1090, 522, 24),
      block(1018, 510, 24, 74, 'wood'), block(1088, 510, 24, 74, 'glass'),
      block(1053, 466, 112, 20, 'stone'),
    ],
  },
  4: {
    stage: 4, title: '위험천만 시계탑', theme: 'clock-twilight', ammo: 5, bonusChallenge: { timeLimitMs: 90000, bonusScore: 800, badge: '셔터 통과' },
    attackRoutes: [
      { name: '움직이는 셔터', hint: '셔터가 열릴 때 안쪽 기둥을 직접 맞히기', target: { x: 750, y: 390 } },
      { name: '오른쪽 계단 탑', hint: '높은 계단 탑을 무너뜨려 측면에서 덮치기', target: { x: 1240, y: 458 } },
    ],
    story: {
      speaker: '시계탑 집사냥', avatar: '🕰️😼',
      text: '셔터가 움직이는 틈을 노려 보라냥!', chickReply: '달걀을 지키며 쇠사슬을 끊겠어!',
      instruction: '\uC154\uD130\uAC00 \uC5F4\uB9B0 \uC21C\uAC04\uC744 \uB178\uB824 \uC548\uCABD\uC744 \uB9DE\uD600 \uBCF4\uC138\uC694.',
    },
    spawns: [
      { kind: 'tire', x: 690, y: 630, radius: 40 },
      { kind: 'gear', x: 620, y: 450, radius: 50, angularSpeed: 0.025 },
      { kind: 'shutter', x: 750, y: 390, w: 24, h: 150, minY: 300, maxY: 480, speed: 2 },
      { kind: 'chandelier', x: 780, y: 330, w: 100, h: 36, anchor: { x: 780, y: 190 } },
      block(850, 620, 30, 100, 'steel'), block(990, 620, 28, 100, 'wood'),
      block(920, 558, 190, 22, 'stone'), cat(875, 522, 24, 1),
      { kind: 'egg', x: 1190, y: 650 }, cat(970, 522, 24),
      block(875, 505, 26, 84, 'wood'), block(965, 505, 26, 84, 'stone'),
      block(920, 454, 142, 22, 'wood'), cat(920, 418, 24, 1),
      block(1040, 620, 28, 100, 'stone'), block(1140, 620, 28, 100, 'wood'),
      block(1090, 558, 140, 22, 'rubber'), cat(1090, 522, 25, 1),
      block(1090, 508, 60, 76, 'glass'),
      // A staggered side tower gives the timed shutter a clear route into the fort.
      block(1190, 620, 24, 100, 'steel'), block(1190, 558, 92, 20, 'wood'),
      block(1240, 570, 22, 200, 'stone'), block(1240, 458, 94, 22, 'rubber'),
      block(1290, 520, 24, 300, 'wood'), block(1290, 358, 100, 22, 'steel'),
      block(1215, 494, 16, 72, 'glass'), block(1265, 424, 16, 72, 'wood'),
    ],
  },
  5: {
    stage: 5, title: '보스의 폐공장 벙커', theme: 'factory-night', ammo: 4, bonusChallenge: { timeLimitMs: 100000, bonusScore: 900, badge: '연쇄 폭발' },
    attackRoutes: [
      { name: '왼쪽 TNT 연쇄', hint: '낮은 폭약 두 개를 연쇄시켜 벙커를 흔들기', target: { x: 716, y: 646 } },
      { name: '오른쪽 상단 TNT', hint: '높은 폭약을 떨어뜨려 위층부터 폭파하기', target: { x: 1270, y: 334 } },
    ],
    story: {
      speaker: '벙커 방패대장', avatar: '🛡️😾',
      text: '두 겹 방패와 TNT 벙커다냥!', chickReply: '메테오 급강하로 빈틈을 열겠어!',
      instruction: 'TNT \uD558\uB098\uB97C \uD130\uB728\uB824 \uC8FC\uBCC0 \uD3ED\uBC1C\uC744 \uC5F0\uC1C4\uC2DC\uD0A4\uC138\uC694.',
    },
    spawns: [
      block(690, 646, 44, 48, 'tnt'), block(742, 646, 44, 48, 'tnt'),
      block(800, 620, 30, 100, 'steel'), block(970, 620, 30, 100, 'steel'),
      block(885, 558, 220, 24, 'stone'), cat(840, 520, 24, 2), cat(930, 520, 24, 2),
      block(830, 500, 28, 92, 'stone'), block(940, 500, 28, 92, 'rubber'),
      block(885, 444, 164, 22, 'glass'), cat(885, 408, 25, 1),
      block(700, 646, 76, 48, 'stone'), block(668, 605, 18, 46, 'wood'),
      block(732, 605, 18, 46, 'stone'), block(700, 575, 92, 16, 'wood'),
      block(674, 544, 18, 46, 'glass'), block(726, 544, 18, 46, 'wood'),
      block(700, 514, 82, 16, 'stone'), block(700, 484, 18, 44, 'wood'),
      block(1030, 620, 30, 100, 'stone'), block(1160, 620, 30, 100, 'stone'),
      block(1095, 558, 178, 24, 'stone'), cat(1060, 520, 24, 2), cat(1130, 520, 24),
      block(1060, 505, 26, 82, 'wood'), block(1130, 505, 26, 82, 'wood'),
      block(1095, 456, 120, 20, 'stone'), block(1095, 424, 44, 44, 'tnt'),
      // Offset decks and cross braces make the late TNT route a stepped, interlocked fort.
      block(1190, 620, 26, 100, 'steel'), block(1190, 558, 110, 22, 'stone'), cat(1190, 522, 24, 1),
      block(1245, 570, 24, 200, 'wood'), block(1245, 458, 112, 22, 'rubber'),
      block(1300, 520, 28, 300, 'stone'), block(1300, 358, 118, 24, 'steel'),
      block(1270, 334, 72, 18, 'tnt'),
    ],
  },
  6: {
    stage: 6, title: '둥지 탈환 대축제', theme: 'meadow-gold', ammo: 5, bonusChallenge: { timeLimitMs: 120000, bonusScore: 1200, badge: '요새 정복' },
    attackRoutes: [
      { name: '왼쪽 TNT 다리', hint: '낮은 TNT 다리를 끊어 보스 요새를 흔들기', target: { x: 756, y: 646 } },
      { name: '선풍기와 높은 받침', hint: '바람을 타고 높은 보스 받침을 직접 노리기', target: { x: 910, y: 398 } },
    ],
    story: {
      speaker: '보스 고양이 킹냥이', avatar: '👑🐱',
      text: '세 겹 요새를 지키는 내가 마지막 상대다냥!', chickReply: '황금 깃털로 우리 둥지를 되찾겠어!',
      instruction: '\uC120\uD48D\uAE30\uC640 TNT\uB97C \uD65C\uC6A9\uD574 \uBCF4\uC2A4 \uC694\uC0C8\uB97C \uBB34\uB108\uB728\uB9AC\uC138\uC694.',
    },
    spawns: [
      { kind: 'fan', x: 450, y: 425, w: 200, h: 450, forceX: 0.0008, forceY: -0.012 },
      { kind: 'gear', x: 540, y: 430, radius: 44, angularSpeed: -0.025 },
      { kind: 'tire', x: 590, y: 630, radius: 40 },
      { kind: 'shutter', x: 660, y: 400, w: 26, h: 150, minY: 310, maxY: 490, speed: 2.4 },
      { kind: 'chandelier', x: 810, y: 290, w: 110, h: 40, anchor: { x: 810, y: 175 } },
      block(730, 646, 44, 48, 'tnt'), block(782, 646, 44, 48, 'tnt'),
      block(850, 620, 30, 100, 'steel'), block(1080, 620, 30, 100, 'steel'),
      block(965, 558, 270, 24, 'stone'), cat(850, 522, 24, 2), cat(1080, 522, 24, 1),
      block(895, 503, 26, 86, 'wood'), block(1035, 503, 26, 86, 'wood'),
      block(965, 448, 200, 24, 'stone'), block(910, 398, 26, 76, 'steel'),
      block(1020, 398, 26, 76, 'wood'), block(965, 348, 140, 24, 'steel'),
      block(880, 286, 26, 100, 'steel'), block(1050, 286, 26, 100, 'steel'),
      block(965, 318, 176, 20, 'wood'), block(965, 286, 190, 20, 'rubber'),
      block(965, 254, 150, 18, 'glass'),
      block(965, 224, 230, 24, 'rubber'),
      block(620, 646, 44, 48, 'stone'), block(620, 610, 60, 18, 'wood'),
      block(680, 646, 44, 48, 'stone'), block(680, 610, 60, 18, 'glass'),
      block(740, 646, 44, 48, 'wood'), block(740, 610, 60, 18, 'stone'),
      block(800, 646, 44, 48, 'stone'), block(800, 610, 60, 18, 'wood'),
      block(860, 646, 44, 48, 'wood'), block(860, 610, 60, 18, 'glass'),
      block(920, 646, 44, 48, 'stone'), block(920, 610, 60, 18, 'wood'),
      block(1150, 646, 44, 48, 'tnt'), block(1115, 620, 30, 100, 'glass'),
      cat(965, 298, 38, 0, true, 150), { kind: 'egg', x: 1220, y: 650 },
    ],
  },
};
