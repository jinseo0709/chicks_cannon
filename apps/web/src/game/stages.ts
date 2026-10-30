import type { BlockKind, GameStage, SpawnSpec, StageDefinition } from './types';

const block = (x: number, y: number, w: number, h: number, material: BlockKind = 'wood'): SpawnSpec =>
  ({ kind: 'block', x, y, w, h, material });
const cat = (x: number, y: number, radius = 24, shieldLayers = 0, boss = false, hp?: number): SpawnSpec =>
  ({ kind: 'cat', x, y, radius, shieldLayers, shield: shieldLayers > 0, boss, hp });

interface FortOptions {
  centerX?: number;
  deckY?: number;
  width?: number;
  baseMaterial?: BlockKind;
  deckMaterial?: BlockKind;
  lowerCats?: number;
  upperCat?: boolean;
  shieldLayers?: number;
  upperShieldLayers?: number;
  upperMaterial?: BlockKind;
  extraTop?: boolean;
  crownTop?: boolean;
  crownCat?: boolean;
}

/** A deterministic, reusable fort footprint; each stage adds a distinct layout mechanic. */
function fort(options: FortOptions = {}): SpawnSpec[] {
  const centerX = options.centerX ?? 920;
  const deckY = options.deckY ?? 558;
  const width = options.width ?? 190;
  const supportWidth = 28;
  const material = options.baseMaterial ?? 'wood';
  const deckMaterial = options.deckMaterial ?? 'wood';
  const leftX = centerX - width / 2 + supportWidth / 2;
  const rightX = centerX + width / 2 - supportWidth / 2;
  const lowerY = deckY + 62;
  const result: SpawnSpec[] = [
    block(leftX, lowerY, supportWidth, 100, material),
    block(rightX, lowerY, supportWidth, 100, material),
    block(centerX, deckY, width, 22, deckMaterial),
  ];
  const count = options.lowerCats ?? 1;
  for (let index = 0; index < count; index += 1) {
    const x = count === 1 ? centerX : centerX - width * 0.28 + index * (width * 0.56 / (count - 1));
    result.push(cat(x, deckY - 34, 23, options.shieldLayers ?? 0));
  }
  const upperY = deckY - 104;
  const upperSupportY = upperY + 51;
  result.push(
    block(centerX - 45, upperSupportY, 24, 74, options.upperMaterial ?? 'wood'),
    block(centerX + 45, upperSupportY, 24, 74, options.upperMaterial ?? 'wood'),
    block(centerX, upperY, 112, 20, options.upperMaterial ?? 'glass'),
  );
  if (options.upperCat) result.push(cat(centerX, upperY - 34, 23, options.upperShieldLayers ?? 0));
  if (options.extraTop) {
    result.push(
      block(centerX - 34, upperY - 64, 18, 54, 'stone'),
      block(centerX + 34, upperY - 64, 18, 54, 'stone'),
      block(centerX, upperY - 92, 86, 18, 'rubber'),
    );
  }
  if (options.crownTop) {
    const crownY = upperY - 184;
    result.push(
      block(centerX - 25, crownY + 28, 18, 50, 'stone'),
      block(centerX + 25, crownY + 28, 18, 50, 'stone'),
      block(centerX, crownY, 82, 18, 'steel'),
    );
    if (options.crownCat) result.push(cat(centerX, crownY - 34, 22, options.upperShieldLayers ?? 0));
  }
  return result;
}

type StageContent = Omit<StageDefinition, 'stage' | 'region'> & { region: 1 | 2 | 3 | 4 };

function makeStage(stage: GameStage, content: StageContent): StageDefinition {
  return { stage, ...content };
}

export const STAGES: Readonly<Record<GameStage, StageDefinition>> = {
  1: makeStage(1, {
    region: 1, theme: 'alley-day', title: '골목의 첫 발사', ammo: 6,
    bonusChallenge: { timeLimitMs: 38000, bonusScore: 300, badge: '첫 출발' },
    attackRoutes: [
      { name: '계단 아래 받침', hint: '첫 계단을 맞혀 위쪽 발판을 연달아 흔들기', target: { x: 760, y: 660 } },
      { name: '중간 발판', hint: '중간 계단을 끊어 꼭대기 고양이에게 접근하기', target: { x: 940, y: 600 } },
    ],
    story: { speaker: '골목대장 고양이', avatar: '🐱', text: '황금알의 빛은 초원의 봄을 깨우는 힘이다냥. 그 힘은 우리 왕이 차지할 거다!', chickReply: '황금알은 모두의 새봄을 품고 있어. 깨지지 않게 지켜 초원으로 돌려보낼 거야!', instruction: '계단 아래를 맞히거나 중간 발판을 끊어 꼭대기 고양이에게 다가가요.' },
    spawns: [
      block(760, 660, 80, 20), block(820, 640, 80, 20), block(880, 620, 80, 20),
      block(940, 600, 80, 20), block(1000, 580, 80, 20), block(1060, 560, 80, 20),
      cat(1060, 537), { kind: 'egg', x: 1190, y: 650 },
    ],
  }),
  2: makeStage(2, {
    region: 1, theme: 'alley-day', title: '빨랫줄 골목', ammo: 6,
    bonusChallenge: { timeLimitMs: 40000, bonusScore: 350, badge: '빨랫줄 돌파' },
    attackRoutes: [
      { name: '낮은 돌기둥', hint: '왼쪽 돌기둥을 끊어 아래 유리 다리를 기울이기', target: { x: 770, y: 625 } },
      { name: '맨 위 유리 다리', hint: '높은 유리판을 깨 위쪽 고양이 둘을 떨어뜨리기', target: { x: 1070, y: 418 } },
    ],
    story: { speaker: '빨랫줄 경비 고양이', avatar: '😼', text: '빨랫줄 골목은 한 발도 못 지나간다냥!', chickReply: '그럼 위와 아래를 동시에 흔들겠어!', instruction: '층마다 높이가 다른 발판을 살피고 돌기둥이나 꼭대기 유리 다리를 노려요.' },
    spawns: [
      block(620, 634, 22, 90), block(700, 634, 22, 90), block(660, 580, 160, 18),
      block(770, 625, 24, 90, 'stone'), block(850, 625, 24, 90, 'stone'), block(810, 575, 160, 18, 'glass'),
      cat(785, 548, 23, 1), cat(835, 548, 23, 1),
      block(920, 560, 20, 76), block(1000, 560, 20, 76), block(960, 516, 150, 18),
      cat(960, 489, 23, 1),
      block(1030, 460, 20, 75), block(1110, 460, 20, 75), block(1070, 418, 140, 18, 'glass'),
      cat(1045, 391), cat(1095, 391),
      { kind: 'egg', x: 1200, y: 650 },
    ],
  }),
  3: makeStage(3, {
    region: 1, theme: 'alley-day', title: '여닫이 바닥', ammo: 6,
    bonusChallenge: { timeLimitMs: 42000, bonusScore: 400, badge: '바닥 뒤집기' },
    attackRoutes: [
      { name: '여닫이 경첩', hint: '경첩판을 열어 낮은 통로를 만들기', target: { x: 640, y: 590 } },
      { name: '위층 유리 발판', hint: '유리 발판을 깨 꼭대기 고양이와 방패를 떨어뜨리기', target: { x: 850, y: 450 } },
    ],
    story: { speaker: '바닥지기 고양이', avatar: '🐈', text: '바닥을 열어도 내 요새는 끄떡없다냥!', chickReply: '경첩을 열어 길을 만들 거야!', instruction: '경첩판으로 낮은 길을 열거나 아래 돌기둥을 끊어 위층을 무너뜨려요.' },
    spawns: [
      { kind: 'trapdoor', x: 640, y: 590, w: 150, h: 16, anchor: { x: 565, y: 590 }, triggerImpact: 5 },
      block(780, 620, 24, 110, 'stone'), block(920, 620, 24, 110, 'stone'), block(850, 560, 210, 20, 'stone'),
      cat(815, 527), cat(885, 527),
      block(780, 495, 22, 80), block(920, 495, 22, 80), block(850, 450, 210, 18, 'glass'), block(1000, 560, 110, 18, 'glass'),
      cat(825, 417, 23, 1), cat(885, 417),
    ],
  }),
  4: makeStage(4, {
    region: 1, theme: 'wall-afternoon', title: '성벽의 돌무더기', ammo: 5,
    bonusChallenge: { timeLimitMs: 44000, bonusScore: 450, badge: '성벽 돌파' },
    attackRoutes: [
      { name: '바위 굴리기', hint: '바위를 굴려 아치의 왼쪽 받침을 무너뜨리기', target: { x: 700, y: 620 } },
      { name: '아치 꼭대기', hint: '윗돌을 맞혀 아치 안쪽 고양이 발판을 흔들기', target: { x: 905, y: 345 } },
    ],
    story: { speaker: '성벽 수비대장', avatar: '🪨🐱', text: '이 돌무더기를 넘을 수 있겠냥?', chickReply: '바위를 굴려 길을 열겠어!', instruction: '바위를 밀어 아치 받침을 부수거나 꼭대기 고무판을 맞혀요.' },
    spawns: [
      { kind: 'boulder', x: 700, y: 620, radius: 27 },
      block(800, 620, 30, 110, 'stone'), block(1010, 620, 30, 110, 'stone'), block(905, 560, 260, 20),
      cat(850, 526), cat(905, 526), cat(960, 526),
      block(855, 500, 26, 100, 'stone'), block(955, 500, 26, 100, 'stone'), block(905, 450, 160, 20, 'stone'),
      cat(905, 416),
      block(870, 390, 22, 80, 'stone'), block(940, 390, 22, 80, 'stone'), block(905, 345, 110, 18, 'rubber'),
    ],
  }),
  5: makeStage(5, {
    region: 1, theme: 'wall-afternoon', title: '성문 아래 비밀길', ammo: 5,
    bonusChallenge: { timeLimitMs: 46000, bonusScore: 500, badge: '골목의 영웅' },
    attackRoutes: [
      { name: '낮은 여닫이 통로', hint: '경첩판을 열어 계단 요새의 밑부분을 노리기', target: { x: 620, y: 590 } },
      { name: '셔터가 열린 순간', hint: '셔터가 올라가면 계단 아래 받침을 맞히기', target: { x: 760, y: 440 } },
    ],
    story: { speaker: '성문 경비대장', avatar: '🛡️😾', text: '성문 아래 비밀길은 아무도 모른다냥!', chickReply: '바닥과 셔터를 함께 열겠어!', instruction: '여닫이판으로 낮은 길을 만들고 셔터가 올라가는 순간 계단 아래를 노리세요.' },
    spawns: [
      { kind: 'trapdoor', x: 620, y: 590, w: 145, h: 16, anchor: { x: 548, y: 590 }, triggerImpact: 5 },
      { kind: 'shutter', x: 760, y: 440, w: 24, h: 140, minY: 350, maxY: 500, speed: 2 },
      block(815, 650, 24, 60, 'stone'), block(875, 650, 24, 60, 'stone'), block(980, 650, 24, 60, 'stone'),
      block(1085, 650, 24, 60, 'stone'), block(1145, 650, 24, 60), block(980, 620, 360, 20),
      cat(920, 586), cat(980, 586), cat(1040, 586),
      block(900, 570, 20, 60), block(1100, 570, 20, 60), block(1000, 530, 250, 20),
      cat(960, 496), cat(1040, 496, 23, 1),
      block(900, 480, 20, 60), block(1060, 480, 20, 60), block(980, 440, 200, 20, 'rubber'), cat(980, 406),
      block(940, 390, 20, 60), block(1020, 390, 20, 60), block(980, 350, 120, 20, 'glass'),
    ],
  }),
  6: makeStage(6, {
    region: 2, bossRole: 'mid', theme: 'rooftop-sunset', title: '지붕 위의 고양이 대장', ammo: 5,
    bonusChallenge: { timeLimitMs: 50000, bonusScore: 550, badge: '첫 승리' },
    attackRoutes: [
      { name: '아래 방어 발판', hint: '낮은 받침을 무너뜨려 대장의 발판을 흔들기', target: { x: 800, y: 650 } },
      { name: '선풍기 바람길', hint: '상승 바람을 타고 위쪽 방패 뒤를 노리기', target: { x: 500, y: 430 } },
    ],
    story: { speaker: '옥상 고양이 대장', avatar: '👑🐱', text: '왕은 황금알의 빛으로 봄을 가두려 한다냥. 그게 왕의 명령이다!', chickReply: '봄은 누구의 보물도 아니야. 황금알을 구해 초원에 돌려줄게!', instruction: '아래 받침을 흔들거나 선풍기 상승풍으로 방패 뒤를 공략하세요.' },
    spawns: [
      { kind: 'fan', x: 500, y: 430, w: 180, h: 420, forceX: 0.0008, forceY: -0.012 },
      block(800, 650, 30, 40, 'stone'), block(1000, 650, 30, 40, 'stone'), block(900, 620, 240, 20),
      cat(840, 586), cat(900, 586), cat(960, 586),
      block(860, 560, 24, 80, 'stone'), block(940, 560, 24, 80, 'stone'), block(900, 510, 160, 20),
      cat(900, 476, 23, 1),
      block(860, 440, 24, 80), block(940, 440, 24, 80), block(900, 390, 160, 20, 'rubber'),
      cat(900, 354, 36, 0, true, 260),
    ],
  }),
  7: makeStage(7, {
    region: 2, theme: 'rooftop-sunset', title: '바람 타는 옥상', ammo: 5,
    bonusChallenge: { timeLimitMs: 46000, bonusScore: 550, badge: '바람길 질주' },
    attackRoutes: [
      { name: '선풍기와 시소', hint: '시소를 밟아 선풍기 바람에 올라타기', target: { x: 700, y: 650 } },
      { name: '바람길 끝 발판', hint: '높은 발판을 맞혀 방패 고양이를 떨어뜨리기', target: { x: 1190, y: 420 } },
    ],
    story: { speaker: '옥상 바람잡이', avatar: '😺', text: '바람의 방향부터 읽어 보라냥!', chickReply: '질풍을 타고 지붕을 건너겠어!', instruction: '시소와 선풍기로 높이를 얻고 오른쪽으로 갈수록 올라가는 세 발판을 공략하세요.' },
    spawns: [
      { kind: 'fan', x: 470, y: 430, w: 220, h: 460, forceX: 0.001, forceY: -0.012 },
      { kind: 'seesaw', x: 700, y: 650, w: 180, h: 14 },
      block(800, 649, 20, 42), block(900, 649, 20, 42), block(850, 620, 180, 18),
      cat(800, 587), cat(860, 587),
      block(950, 595, 20, 150), block(1070, 595, 20, 150), block(1010, 520, 180, 18), cat(1010, 487),
      block(1135, 545, 20, 250), block(1245, 545, 20, 250), block(1190, 420, 150, 18), cat(1190, 387, 23, 1),
    ],
  }),
  8: makeStage(8, {
    region: 2, theme: 'rooftop-sunset', title: '시계손의 그림자', ammo: 5,
    bonusChallenge: { timeLimitMs: 48000, bonusScore: 600, badge: '시계손 통과' },
    attackRoutes: [
      { name: '시계손의 회전축', hint: '시계손이 지나간 직후 회전축 안쪽을 통과하기', target: { x: 690, y: 430 } },
      { name: '오른쪽 시계 발판', hint: '오른쪽 발판의 기둥을 끊어 아래 고양이에게 접근하기', target: { x: 1120, y: 520 } },
    ],
    story: { speaker: '시계탑 수리공 고양이', avatar: '🕰️🐱', text: '시계손이 한 바퀴 돌 때마다 길이 바뀐다냥!', chickReply: '틈이 생기는 순간을 노릴게!', instruction: '왼쪽 낮은 발판에서 오른쪽 발판을 거쳐 가운데 높은 발판으로 가며 시계손이 비키는 순간을 기다리세요.' },
    spawns: [
      { kind: 'clockHand', x: 690, y: 430, w: 210, h: 18, anchor: { x: 590, y: 430 }, angularSpeed: 0.45 },
      block(720, 649, 20, 42), block(800, 649, 20, 42), block(760, 620, 120, 18), cat(730, 587), cat(790, 587),
      block(1060, 595, 20, 150), block(1180, 595, 20, 150), block(1120, 520, 160, 18), cat(1120, 487),
      block(880, 545, 20, 250), block(980, 545, 20, 250), block(930, 420, 150, 18, 'glass'), cat(930, 387, 23, 1),
    ],
  }),
  9: makeStage(9, {
    region: 2, theme: 'clock-twilight', title: '톱니 시계탑', ammo: 4,
    bonusChallenge: { timeLimitMs: 50000, bonusScore: 650, badge: '톱니 틈새' },
    attackRoutes: [
      { name: '첫 번째 톱니섬', hint: '기어를 맞혀 튕긴 뒤 첫 방패 발판을 흔들기', target: { x: 620, y: 470 } },
      { name: '회전손 너머 길', hint: '시계손이 비키면 오른쪽 방패 발판으로 건너가기', target: { x: 700, y: 430 } },
    ],
    story: { speaker: '시계탑 기술자', avatar: '⚙️😼', text: '톱니와 시계손이 네 길을 막을 거다냥!', chickReply: '회전의 틈을 찾아 돌파하겠어!', instruction: '기어와 시계손을 지나 높이가 다른 다섯 개 발판을 따라 방패 고양이를 공략하세요.' },
    spawns: [
      { kind: 'clockHand', x: 700, y: 430, w: 220, h: 18, anchor: { x: 590, y: 430 }, angularSpeed: -0.4 },
      { kind: 'gear', x: 620, y: 470, radius: 48, angularSpeed: 0.03 },
      block(670, 649, 20, 42), block(750, 649, 20, 42), block(710, 620, 120, 18), cat(710, 587, 23, 1),
      block(800, 585, 20, 170), block(880, 585, 20, 170), block(840, 500, 120, 18), cat(840, 467, 23, 1),
      block(930, 635, 20, 70), block(1010, 635, 20, 70), block(970, 600, 120, 18), cat(970, 567, 23, 1),
      block(1060, 560, 20, 220), block(1140, 560, 20, 220), block(1100, 450, 100, 18), cat(1100, 417, 23, 1),
      block(1180, 615, 20, 110), block(1260, 615, 20, 110), block(1220, 560, 100, 18, 'glass'), cat(1220, 527),
    ],
  }),
  10: makeStage(10, {
    region: 2, theme: 'clock-twilight', title: '종소리 꼭대기', ammo: 4,
    bonusChallenge: { timeLimitMs: 52000, bonusScore: 700, badge: '옥상의 질주' },
    attackRoutes: [
      { name: '종 아래 샹들리에', hint: '샹들리에를 흔들어 아래층 세 고양이를 덮치기', target: { x: 780, y: 330 } },
      { name: '시계손 통로', hint: '시계손의 회전 방향을 따라 위층으로 진입하기', target: { x: 650, y: 400 } },
    ],
    story: { speaker: '종탑의 세 고양이', avatar: '🔔😾', text: '마지막 종이 울리기 전에 돌아가라냥!', chickReply: '종소리보다 빠르게 지나가겠어!', instruction: '시계손과 샹들리에가 만든 통로를 이용하세요.' },
    spawns: [
      { kind: 'clockHand', x: 650, y: 400, w: 210, h: 18, anchor: { x: 550, y: 400 }, angularSpeed: 0.42 },
      { kind: 'chandelier', x: 780, y: 330, w: 100, h: 36, anchor: { x: 780, y: 190 } },
      block(800, 650, 20, 40), block(860, 650, 20, 40), block(1060, 650, 20, 40), block(1120, 650, 20, 40), block(960, 620, 400, 20),
      cat(870, 586), cat(960, 586), cat(1050, 586),
      block(870, 565, 20, 90), block(1050, 565, 20, 90), block(960, 510, 300, 20), cat(920, 476), cat(1000, 476),
      block(900, 460, 20, 80), block(1020, 460, 20, 80), block(960, 400, 220, 20), cat(960, 366, 23, 1),
      block(900, 350, 20, 120), block(1020, 350, 20, 120), block(960, 280, 160, 20),
      block(940, 225, 20, 110), block(980, 225, 20, 110), block(960, 160, 120, 20), block(960, 220, 18, 100),
    ],
  }),
  11: makeStage(11, {
    region: 3, theme: 'factory-night', title: '공장 가동', ammo: 5,
    bonusChallenge: { timeLimitMs: 48000, bonusScore: 700, badge: '첫 생산품' },
    attackRoutes: [
      { name: '컨베이어 시작점', hint: '벨트 위 블록을 밀어 낮은 지지대를 부수기', target: { x: 885, y: 600 } },
      { name: '공장 상부 발판', hint: '컨베이어가 옮긴 물체를 위층 고양이에게 보내기', target: { x: 920, y: 454 } },
    ],
    story: { speaker: '공장 감독 고양이', avatar: '🏭🐱', text: '조립 라인은 멈추지 않는다냥!', chickReply: '벨트를 타고 공장을 거꾸로 돌리겠어!', instruction: '벨트로 낮은 받침을 무너뜨린 뒤, 한 단 높은 발판의 고양이를 노리세요.' },
    spawns: [
      { kind: 'conveyor', x: 700, y: 650, w: 220, h: 18, forceX: 5 },
      block(840, 640, 22, 60, 'steel'), block(930, 640, 22, 60, 'steel'), block(885, 600, 150, 20, 'steel'),
      cat(845, 566), cat(885, 566), cat(925, 566),
      block(865, 520, 20, 80, 'steel'), block(905, 520, 20, 80, 'steel'), block(885, 465, 120, 20, 'steel'), cat(885, 431),
    ],
  }),
  12: makeStage(12, {
    region: 3, theme: 'factory-night', title: '타이어 시험장', ammo: 5,
    bonusChallenge: { timeLimitMs: 50000, bonusScore: 750, badge: '반동 전문가' },
    attackRoutes: [
      { name: '타이어 반동', hint: '타이어를 밟고 높이 튀어 올라 윗층을 노리기', target: { x: 680, y: 630 } },
      { name: '벨트 끝 지지대', hint: '컨베이어로 블록을 옮겨 오른쪽 받침을 무너뜨리기', target: { x: 1018, y: 620 } },
    ],
    story: { speaker: '타이어 시험장 고양이', avatar: '🛞😼', text: '반동을 제어하지 못하면 빙글빙글 돈다냥!', chickReply: '이번엔 내가 튀어 오를 차례야!', instruction: '타이어로 높은 중앙 탑에 접근하고, 오른쪽 낮은 발판은 벨트로 흔드세요.' },
    spawns: [
      { kind: 'tire', x: 680, y: 630, radius: 42 },
      { kind: 'conveyor', x: 760, y: 650, w: 200, h: 18, forceX: 4 },
      block(910, 640, 24, 60, 'stone'), block(1030, 640, 24, 60, 'stone'), block(970, 600, 180, 20, 'stone'),
      cat(925, 566), cat(970, 566), cat(1015, 566),
      block(930, 520, 22, 90, 'steel'), block(1010, 520, 22, 90, 'steel'), block(970, 460, 140, 20, 'steel'), cat(970, 426, 23, 1),
      block(950, 402, 18, 50, 'stone'), block(990, 402, 18, 50, 'stone'), block(970, 375, 90, 18, 'rubber'),
      block(1130, 640, 24, 60, 'wood'), block(1190, 640, 24, 60, 'wood'), block(1160, 600, 100, 20, 'glass'), cat(1160, 566),
      block(1130, 520, 20, 60, 'wood'), block(1190, 520, 20, 60, 'wood'), block(1160, 480, 100, 20, 'glass'),
    ],
  }),
  13: makeStage(13, {
    region: 3, theme: 'factory-night', title: '기어 압착기', ammo: 4,
    bonusChallenge: { timeLimitMs: 52000, bonusScore: 800, badge: '기어 틈새' },
    attackRoutes: [
      { name: '회전 기어', hint: '기어 반동으로 방패 고양이의 옆을 노리기', target: { x: 620, y: 465 } },
      { name: '컨베이어 통로', hint: '벨트 위 발판으로 안전한 틈을 지나기', target: { x: 750, y: 650 } },
    ],
    story: { speaker: '압착기 담당 고양이', avatar: '⚙️🐈', text: '기어가 맞물리면 도망칠 틈도 없다냥!', chickReply: '기어가 비는 순간 통과하겠어!', instruction: '기어 옆 낮은 통로를 지나 두 구역으로 나뉜 발판의 방패 고양이를 공략하세요.' },
    spawns: [
      { kind: 'gear', x: 620, y: 465, radius: 50, angularSpeed: -0.035 },
      { kind: 'conveyor', x: 750, y: 650, w: 210, h: 18, forceX: 4.5 },
      block(820, 640, 24, 60, 'stone'), block(920, 640, 24, 60, 'stone'), block(870, 600, 150, 20, 'stone'),
      cat(835, 566, 23, 1), cat(870, 566, 23, 1), cat(905, 566, 23, 1),
      block(840, 520, 20, 80, 'wood'), block(900, 520, 20, 80, 'wood'), block(870, 465, 110, 20, 'glass'), cat(870, 431, 23, 1),
      block(852, 402, 18, 50, 'stone'), block(888, 402, 18, 50, 'stone'), block(870, 375, 82, 18, 'rubber'),
      block(1060, 640, 24, 60, 'steel'), block(1160, 640, 24, 60, 'steel'), block(1110, 600, 150, 20, 'glass'), cat(1110, 566),
      block(1085, 520, 20, 80, 'steel'), block(1135, 520, 20, 80, 'steel'), block(1110, 465, 110, 20, 'glass'),
    ],
  }),
  14: makeStage(14, {
    region: 3, theme: 'factory-night', title: '셔터 작업장', ammo: 4,
    bonusChallenge: { timeLimitMs: 54000, bonusScore: 850, badge: '셔터 돌파' },
    attackRoutes: [
      { name: '작업장 셔터', hint: '셔터가 열릴 때 벨트를 따라 안쪽을 맞히기', target: { x: 760, y: 430 } },
      { name: '분리된 블록 더미', hint: '왼쪽 받침을 끊어 두 더미를 연쇄로 무너뜨리기', target: { x: 825, y: 620 } },
    ],
    story: { speaker: '작업장 문지기', avatar: '🚪😾', text: '셔터가 닫히면 다시 열리지 않는다냥!', chickReply: '열리는 순간을 놓치지 않을게!', instruction: '셔터가 올라간 틈에 중앙 작업대를 지나 오른쪽 낮은 발판까지 이어가세요.' },
    spawns: [
      { kind: 'shutter', x: 760, y: 430, w: 24, h: 140, minY: 340, maxY: 500, speed: 2.2 },
      { kind: 'conveyor', x: 700, y: 650, w: 180, h: 18, forceX: 4 },
      block(850, 640, 24, 60, 'steel'), block(950, 640, 24, 60, 'steel'), block(900, 600, 150, 20, 'stone'),
      cat(860, 566), cat(900, 566), cat(940, 566),
      block(870, 520, 20, 80, 'steel'), block(930, 520, 20, 80, 'steel'), block(900, 465, 110, 20, 'stone'), cat(900, 431),
      block(882, 402, 18, 50, 'stone'), block(918, 402, 18, 50, 'stone'), block(900, 375, 82, 18, 'rubber'),
      block(1090, 640, 24, 60, 'wood'), block(1190, 640, 24, 60, 'wood'), block(1140, 600, 150, 20, 'glass'),
      cat(1115, 566), cat(1165, 566),
    ],
  }),
  15: makeStage(15, {
    region: 3, theme: 'factory-night', title: '마지막 조립 라인', ammo: 4,
    bonusChallenge: { timeLimitMs: 56000, bonusScore: 900, badge: '공장 탈출' },
    attackRoutes: [
      { name: '조립 벨트', hint: '벨트를 역이용해 받침 아래로 파고들기', target: { x: 700, y: 650 } },
      { name: '트램펄린 상단', hint: '트램펄린으로 튀어 올라 세 고양이의 받침을 노리기', target: { x: 650, y: 640 } },
    ],
    story: { speaker: '조립 라인 대장', avatar: '🏭😾', text: '공장 출구는 이 조립 라인 너머다냥!', chickReply: '마지막 벨트도 뛰어넘겠어!', instruction: '기어 옆 트램펄린으로 첫 발판을 넘고, 컨베이어를 이용해 조립탑의 위층을 노리세요.' },
    spawns: [
      { kind: 'conveyor', x: 700, y: 650, w: 220, h: 18, forceX: 5 },
      { kind: 'gear', x: 600, y: 470, radius: 48, angularSpeed: 0.04 },
      { kind: 'trampoline', x: 650, y: 640, w: 120, h: 20 },
      block(870, 640, 24, 60, 'steel'), block(970, 640, 24, 60, 'steel'), block(920, 600, 150, 20, 'steel'),
      cat(880, 566), cat(920, 566), cat(960, 566),
      block(890, 520, 20, 80, 'stone'), block(950, 520, 20, 80, 'stone'), block(920, 465, 110, 20, 'stone'), cat(920, 431, 23, 1),
      block(902, 402, 18, 50, 'stone'), block(938, 402, 18, 50, 'stone'), block(920, 375, 82, 18, 'rubber'),
      block(1100, 640, 24, 60, 'steel'), block(1200, 640, 24, 60, 'steel'), block(1150, 600, 150, 20, 'glass'), cat(1125, 566), cat(1175, 566),
    ],
  }),
  16: makeStage(16, {
    region: 4, theme: 'meadow-gold', title: '민들레 발사대', ammo: 5,
    bonusChallenge: { timeLimitMs: 50000, bonusScore: 900, badge: '꽃바람' },
    attackRoutes: [
      { name: '민들레 꽃받침', hint: '꽃받침을 밟아 위쪽 고양이에게 날아가기', target: { x: 650, y: 630 } },
      { name: '낮은 나무 기둥', hint: '낮은 기둥을 끊어 세 고양이의 발판 무너뜨리기', target: { x: 805, y: 610 } },
    ],
    story: { speaker: '초원 꽃지기', avatar: '🌼🐱', text: '민들레 바람은 용감한 병아리만 태운다냥!', chickReply: '꽃바람을 타고 올라갈게!', instruction: '꽃바람을 타고 낮은 나무 발판에서 중간 섬, 높은 발판 순서로 건너가세요.' },
    spawns: [
      { kind: 'flowerLauncher', x: 650, y: 640, radius: 34, forceY: 11 },
      block(760, 645, 22, 50, 'wood'), block(850, 645, 22, 50, 'wood'), block(805, 610, 130, 20, 'wood'),
      cat(775, 576), cat(805, 576), cat(835, 576),
      block(930, 595, 22, 90, 'wood'), block(990, 595, 22, 90, 'wood'), block(960, 535, 110, 20, 'stone'), cat(960, 501),
      block(1030, 535, 20, 80, 'wood'), block(1090, 535, 20, 80, 'wood'), block(1060, 480, 110, 20, 'stone'), cat(1060, 446),
    ],
  }),
  17: makeStage(17, {
    region: 4, theme: 'meadow-gold', title: '황금빛 시소', ammo: 4,
    bonusChallenge: { timeLimitMs: 52000, bonusScore: 950, badge: '균형 잡기' },
    attackRoutes: [
      { name: '시소 끝판', hint: '시소 한쪽을 눌러 반대편으로 튀어 오르기', target: { x: 700, y: 650 } },
      { name: '꽃 발사대', hint: '꽃받침으로 높이를 얻어 윗층을 직접 맞히기', target: { x: 620, y: 640 } },
    ],
    story: { speaker: '황금 시소지기', avatar: '⚖️😺', text: '균형을 잃으면 다시 바닥으로 떨어진다냥!', chickReply: '시소와 꽃바람을 한 번에 쓸게!', instruction: '시소의 반대편과 꽃 발사대는 서로 다른 상승 경로예요.' },
    spawns: [
      { kind: 'seesaw', x: 700, y: 650, w: 190, h: 14 },
      { kind: 'flowerLauncher', x: 620, y: 640, radius: 34, forceY: 12 },
      block(820, 645, 22, 50, 'stone'), block(900, 645, 22, 50, 'stone'), block(860, 610, 120, 20, 'stone'),
      cat(840, 576), cat(880, 576),
      block(920, 575, 22, 110, 'stone'), block(1000, 575, 22, 110, 'stone'), block(960, 500, 120, 20, 'stone'),
      cat(940, 476), cat(980, 476, 23, 1),
      block(1050, 510, 22, 110, 'wood'), block(1130, 510, 22, 110, 'wood'), block(1090, 435, 120, 20, 'glass'),
      cat(1070, 401), cat(1110, 401),
      block(1150, 645, 22, 50, 'wood'), block(1210, 645, 22, 50, 'wood'), block(1180, 610, 80, 20, 'glass'),
    ],
  }),
  18: makeStage(18, {
    region: 4, theme: 'meadow-gold', title: '바위 정원', ammo: 4,
    bonusChallenge: { timeLimitMs: 54000, bonusScore: 1000, badge: '정원 돌파' },
    attackRoutes: [
      { name: '정원 바위', hint: '바위를 굴려 방패 고양이의 아래쪽 받침을 깨기', target: { x: 720, y: 620 } },
      { name: '황금 꽃 발사대', hint: '꽃바람을 타고 위쪽 방패 뒤를 공략하기', target: { x: 620, y: 640 } },
    ],
    story: { speaker: '바위 정원사', avatar: '🪨🌼', text: '이 정원은 바위와 방패로 지켜진다냥!', chickReply: '바위보다 높이 날아갈 거야!', instruction: '바위의 힘과 꽃 발사대의 상승 궤적을 골라 쓰세요.' },
    spawns: [
      { kind: 'boulder', x: 720, y: 620, radius: 28, armed: true },
      { kind: 'flowerLauncher', x: 620, y: 640, radius: 34, forceY: 12 },
      block(850, 645, 24, 50, 'stone'), block(930, 645, 24, 50, 'stone'), block(890, 610, 120, 20, 'stone'),
      cat(860, 576, 23, 1), cat(890, 576, 23, 1), cat(920, 576, 23, 1),
      block(970, 575, 24, 110, 'stone'), block(1050, 575, 24, 110, 'stone'), block(1010, 500, 120, 20, 'stone'), cat(1010, 466, 23, 1),
      block(1090, 645, 24, 50, 'wood'), block(1170, 645, 24, 50, 'wood'), block(1130, 610, 120, 20, 'glass'),
      cat(1100, 576), cat(1130, 576),
      block(1190, 575, 20, 110, 'wood'), block(1250, 575, 20, 110, 'wood'), block(1220, 500, 90, 20, 'glass'),
    ],
  }),
  19: makeStage(19, {
    region: 4, theme: 'meadow-gold', title: '고양이 왕의 문턱', ammo: 4,
    bonusChallenge: { timeLimitMs: 56000, bonusScore: 1100, badge: '결전 준비' },
    attackRoutes: [
      { name: '황금 발사대', hint: '꽃 발사대로 단단한 윗층 방어를 넘어가기', target: { x: 620, y: 640 } },
      { name: '흔들리는 샹들리에', hint: '샹들리에를 흔들어 성문 안쪽을 무너뜨리기', target: { x: 780, y: 320 } },
    ],
    story: { speaker: '왕의 문지기', avatar: '👑😾', text: '이 문 너머에 고양이 왕이 기다린다냥!', chickReply: '마지막 길을 열고 왕을 만나겠어!', instruction: '꽃 발사대와 샹들리에로 결전 요새의 방어를 약화시키세요.' },
    spawns: [
      { kind: 'flowerLauncher', x: 620, y: 640, radius: 35, forceY: 12 },
      { kind: 'chandelier', x: 780, y: 320, w: 110, h: 38, anchor: { x: 780, y: 180 } },
      block(850, 640, 24, 60, 'steel'), block(930, 640, 24, 60, 'steel'), block(890, 600, 120, 20, 'steel'), cat(860, 566), cat(890, 566), cat(920, 566),
      block(860, 515, 20, 80, 'stone'), block(920, 515, 20, 80, 'stone'), block(890, 460, 110, 20, 'stone'),
      block(880, 402, 18, 50, 'stone'), block(900, 402, 18, 50, 'stone'), block(890, 375, 70, 18, 'rubber'), cat(890, 341, 23, 2),
      block(1030, 640, 24, 60, 'steel'), block(1110, 640, 24, 60, 'steel'), block(1070, 600, 120, 20, 'steel'), cat(1040, 566), cat(1100, 566),
      block(1040, 515, 20, 80, 'wood'), block(1100, 515, 20, 80, 'wood'), block(1070, 460, 110, 20, 'glass'),
    ],
  }),
  20: makeStage(20, {
    region: 4, bossRole: 'final', theme: 'meadow-gold', title: '황금 초원의 고양이 왕', ammo: 5,
    bonusChallenge: { timeLimitMs: 70000, bonusScore: 1500, badge: '초원의 수호자' },
    attackRoutes: [
      { name: '왕의 아래 요새', hint: '아래쪽 강철 받침을 부숴 왕의 방어를 흔들기', target: { x: 850, y: 620 } },
      { name: '왕관 위 약점', hint: '샹들리에를 흔들어 왕관 위 약점을 맞히기', target: { x: 965, y: 285 } },
    ],
    story: { speaker: '황금 초원의 고양이 왕', avatar: '👑🐱', text: '황금알을 깨우면 내 영원한 겨울이 끝난다냥. 절대 빼앗기지 않겠다!', chickReply: '황금알은 네 힘이 아니야. 빛을 모두에게 돌려주고 봄을 깨울 거야!', instruction: '아래 요새를 무너뜨린 뒤 샹들리에를 이용해 왕관 위 약점을 노리세요.' },
    spawns: [
      { kind: 'flowerLauncher', x: 620, y: 640, radius: 36, forceY: 13 },
      { kind: 'chandelier', x: 965, y: 230, w: 130, h: 42, anchor: { x: 965, y: 130 }, breakImpact: 22 },
      block(860, 640, 24, 60, 'steel'), block(1070, 640, 24, 60, 'steel'), block(965, 600, 230, 20, 'stone'),
      cat(925, 566), cat(1005, 566),
      block(900, 520, 22, 80, 'wood'), block(1030, 520, 22, 80, 'wood'), block(965, 465, 150, 20, 'stone'), cat(965, 431),
      block(930, 402, 18, 50, 'stone'), block(1000, 402, 18, 50, 'stone'), block(965, 375, 100, 18, 'rubber'),
      block(880, 286, 26, 100, 'steel'), block(1050, 286, 26, 100, 'steel'),
      block(965, 318, 176, 20, 'wood'),
      cat(965, 328, 23),
      cat(965, 275, 38, 0, true, 500),
      { kind: 'egg', x: 1210, y: 650 },
    ],
  }),
};
