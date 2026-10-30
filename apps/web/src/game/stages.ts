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
  return result;
}

type StageContent = Omit<StageDefinition, 'stage' | 'region'> & { region: 1 | 2 | 3 | 4 };

function makeStage(stage: GameStage, content: StageContent): StageDefinition {
  return { stage, ...content };
}

export const STAGES: Readonly<Record<GameStage, StageDefinition>> = {
  1: makeStage(1, {
    region: 1, theme: 'alley-day', title: '골목의 첫 발사', ammo: 6,
    bonusChallenge: { timeLimitMs: 28000, bonusScore: 300, badge: '첫 출발' },
    attackRoutes: [
      { name: '낮은 나무 받침', hint: '낮은 받침을 맞혀 골목 요새를 무너뜨리기', target: { x: 825, y: 620 } },
      { name: '유리 선반', hint: '위쪽 유리 선반을 깨고 고양이에게 떨어뜨리기', target: { x: 920, y: 454 } },
    ],
    story: { speaker: '골목대장 고양이', avatar: '🐱', text: '이 둥지는 이제 내 낮잠 자리다냥!', chickReply: '첫 발부터 제대로 보여 줄게, 삐약!', instruction: '나무 받침이나 유리 선반을 맞혀 요새를 무너뜨려요.' },
    spawns: [...fort({ lowerCats: 1, upperCat: false }), { kind: 'egg', x: 1190, y: 650 }],
  }),
  2: makeStage(2, {
    region: 1, theme: 'alley-day', title: '빨랫줄 골목', ammo: 6,
    bonusChallenge: { timeLimitMs: 30000, bonusScore: 350, badge: '빨랫줄 돌파' },
    attackRoutes: [
      { name: '왼쪽 계단 받침', hint: '왼쪽 받침을 끊어 방패 고양이 뒤로 들어가기', target: { x: 825, y: 620 } },
      { name: '윗층 유리판', hint: '유리판을 깨 위층을 아래로 떨어뜨리기', target: { x: 920, y: 454 } },
    ],
    story: { speaker: '빨랫줄 경비 고양이', avatar: '😼', text: '빨랫줄 골목은 한 발도 못 지나간다냥!', chickReply: '그럼 위와 아래를 동시에 흔들겠어!', instruction: '단단한 받침 대신 얇은 유리판을 노려 보세요.' },
    spawns: [
      ...fort({ centerX: 860, width: 150, lowerCats: 2, shieldLayers: 1, upperCat: true, upperShieldLayers: 1, baseMaterial: 'stone' }),
      ...fort({ centerX: 1080, width: 120, deckY: 600, lowerCats: 1, deckMaterial: 'glass' }),
      { kind: 'egg', x: 1200, y: 650 },
    ],
  }),
  3: makeStage(3, {
    region: 1, theme: 'alley-day', title: '여닫이 바닥', ammo: 6,
    bonusChallenge: { timeLimitMs: 32000, bonusScore: 400, badge: '바닥 뒤집기' },
    attackRoutes: [
      { name: '여닫이 경첩', hint: '경첩판을 강하게 맞혀 열고 고양이 발판을 무너뜨리기', target: { x: 640, y: 648 } },
      { name: '낮은 성벽', hint: '성벽 아래 받침을 끊어 고양이에게 옆으로 접근하기', target: { x: 825, y: 620 } },
    ],
    story: { speaker: '바닥지기 고양이', avatar: '🐈', text: '바닥을 열어도 내 요새는 끄떡없다냥!', chickReply: '경첩을 열어 길을 만들 거야!', instruction: '충격을 받은 여닫이 바닥은 아래로 열려요.' },
    spawns: [
      { kind: 'trapdoor', x: 640, y: 590, w: 150, h: 16, anchor: { x: 565, y: 590 }, triggerImpact: 5 },
      ...fort({ centerX: 900, lowerCats: 1, baseMaterial: 'stone', upperCat: false }),
      block(900, 520, 130, 20, 'glass'), cat(900, 484, 23, 1),
    ],
  }),
  4: makeStage(4, {
    region: 1, theme: 'wall-afternoon', title: '성벽의 돌무더기', ammo: 5,
    bonusChallenge: { timeLimitMs: 34000, bonusScore: 450, badge: '성벽 돌파' },
    attackRoutes: [
      { name: '바위 굴리기', hint: '바위를 밀어 아래쪽 지지대를 부수기', target: { x: 700, y: 620 } },
      { name: '성벽 윗층', hint: '윗층 돌기둥을 맞혀 두 고양이 사이를 무너뜨리기', target: { x: 920, y: 454 } },
    ],
    story: { speaker: '성벽 수비대장', avatar: '🪨🐱', text: '이 돌무더기를 넘을 수 있겠냥?', chickReply: '바위를 굴려 길을 열겠어!', instruction: '바위는 부딪히면 굴러가며 주변 구조물을 밀어요.' },
    spawns: [
      { kind: 'boulder', x: 700, y: 620, radius: 27, armed: true },
      ...fort({ centerX: 920, lowerCats: 2, shieldLayers: 0, upperCat: true, upperMaterial: 'stone', baseMaterial: 'stone', extraTop: true }),
    ],
  }),
  5: makeStage(5, {
    region: 1, theme: 'wall-afternoon', title: '성문 아래 비밀길', ammo: 5,
    bonusChallenge: { timeLimitMs: 36000, bonusScore: 500, badge: '골목의 영웅' },
    attackRoutes: [
      { name: '성문 여닫이판', hint: '여닫이판을 열어 성문 아래로 진입하기', target: { x: 620, y: 648 } },
      { name: '움직이는 성문', hint: '셔터가 올라갈 때 안쪽 기둥을 직접 맞히기', target: { x: 760, y: 440 } },
    ],
    story: { speaker: '성문 경비대장', avatar: '🛡️😾', text: '성문 아래 비밀길은 아무도 모른다냥!', chickReply: '바닥과 셔터를 함께 열겠어!', instruction: '여닫이판으로 낮은 길을 만들고 셔터가 열린 틈을 노리세요.' },
    spawns: [
      { kind: 'trapdoor', x: 620, y: 590, w: 145, h: 16, anchor: { x: 548, y: 590 }, triggerImpact: 5 },
      { kind: 'shutter', x: 760, y: 440, w: 24, h: 140, minY: 350, maxY: 500, speed: 2 },
      ...fort({ centerX: 950, lowerCats: 2, upperCat: true, upperShieldLayers: 1, baseMaterial: 'stone', deckMaterial: 'wood' }),
      cat(1110, 522, 23),
    ],
  }),
  6: makeStage(6, {
    region: 2, bossRole: 'mid', theme: 'rooftop-sunset', title: '지붕 위의 고양이 대장', ammo: 5,
    bonusChallenge: { timeLimitMs: 40000, bonusScore: 550, badge: '첫 승리' },
    attackRoutes: [
      { name: '낮은 보스 받침', hint: '낮은 받침을 부숴 보스 발밑 요새를 흔들기', target: { x: 850, y: 620 } },
      { name: '선풍기 바람길', hint: '상승 바람을 타고 위쪽 방패 뒤를 노리기', target: { x: 500, y: 430 } },
    ],
    story: { speaker: '옥상 고양이 대장', avatar: '👑🐱', text: '내가 이 지붕의 첫 번째 관문이다냥!', chickReply: '여기서 멈추지 않아, 삐약!', instruction: '받침을 무너뜨리거나 선풍기 바람으로 위쪽을 노리세요.' },
    spawns: [
      { kind: 'fan', x: 500, y: 430, w: 180, h: 420, forceX: 0.0008, forceY: -0.012 },
      ...fort({ centerX: 930, lowerCats: 1, upperCat: false, baseMaterial: 'stone', extraTop: true }),
      cat(930, 330, 36, 0, true, 260),
    ],
  }),
  7: makeStage(7, {
    region: 2, theme: 'rooftop-sunset', title: '바람 타는 옥상', ammo: 5,
    bonusChallenge: { timeLimitMs: 36000, bonusScore: 550, badge: '바람길 질주' },
    attackRoutes: [
      { name: '선풍기 상승풍', hint: '상승풍으로 왼쪽 계단 위를 덮치기', target: { x: 470, y: 430 } },
      { name: '오른쪽 나무 받침', hint: '오른쪽 받침을 끊어 본채를 옆으로 기울이기', target: { x: 1018, y: 620 } },
    ],
    story: { speaker: '옥상 바람잡이', avatar: '😺', text: '바람의 방향부터 읽어 보라냥!', chickReply: '질풍을 타고 지붕을 건너겠어!', instruction: '선풍기 바람은 날아가는 병아리의 궤적을 바꿔요.' },
    spawns: [
      { kind: 'fan', x: 470, y: 430, w: 220, h: 460, forceX: 0.001, forceY: -0.012 },
      ...fort({ centerX: 920, lowerCats: 2, upperCat: true, upperShieldLayers: 1, baseMaterial: 'stone' }),
      { kind: 'seesaw', x: 700, y: 650, w: 180, h: 14 },
    ],
  }),
  8: makeStage(8, {
    region: 2, theme: 'rooftop-sunset', title: '시계손의 그림자', ammo: 5,
    bonusChallenge: { timeLimitMs: 38000, bonusScore: 600, badge: '시계손 통과' },
    attackRoutes: [
      { name: '시계손 회전축', hint: '시계손이 지나간 뒤 회전축 쪽을 통과하기', target: { x: 690, y: 430 } },
      { name: '요새 아래 기둥', hint: '낮은 기둥을 끊어 시간 창 없이 구조물을 무너뜨리기', target: { x: 825, y: 620 } },
    ],
    story: { speaker: '시계탑 수리공 고양이', avatar: '🕰️🐱', text: '시계손이 한 바퀴 돌 때마다 길이 바뀐다냥!', chickReply: '틈이 생기는 순간을 노릴게!', instruction: '시계손의 회전 반대편에서 안전한 통과 순간을 기다리세요.' },
    spawns: [
      { kind: 'clockHand', x: 690, y: 430, w: 210, h: 18, anchor: { x: 590, y: 430 }, angularSpeed: 0.45 },
      ...fort({ centerX: 920, lowerCats: 1, upperCat: true, upperShieldLayers: 1 }),
    ],
  }),
  9: makeStage(9, {
    region: 2, theme: 'clock-twilight', title: '톱니 시계탑', ammo: 4,
    bonusChallenge: { timeLimitMs: 40000, bonusScore: 650, badge: '톱니 틈새' },
    attackRoutes: [
      { name: '맞물린 톱니', hint: '기어를 튕겨 방패 고양이 뒤쪽을 노리기', target: { x: 620, y: 470 } },
      { name: '시계손 위쪽', hint: '시계손이 낮아질 때 윗층 유리판을 깨기', target: { x: 700, y: 430 } },
    ],
    story: { speaker: '시계탑 기술자', avatar: '⚙️😼', text: '톱니와 시계손이 네 길을 막을 거다냥!', chickReply: '회전의 틈을 찾아 돌파하겠어!', instruction: '기어의 반동과 시계손의 움직임을 차례로 이용하세요.' },
    spawns: [
      { kind: 'clockHand', x: 700, y: 430, w: 220, h: 18, anchor: { x: 590, y: 430 }, angularSpeed: -0.4 },
      { kind: 'gear', x: 620, y: 470, radius: 48, angularSpeed: 0.03 },
      ...fort({ centerX: 940, lowerCats: 2, shieldLayers: 1, upperCat: true, upperShieldLayers: 1, baseMaterial: 'stone', extraTop: true }),
    ],
  }),
  10: makeStage(10, {
    region: 2, theme: 'clock-twilight', title: '종소리 꼭대기', ammo: 4,
    bonusChallenge: { timeLimitMs: 42000, bonusScore: 700, badge: '옥상의 질주' },
    attackRoutes: [
      { name: '종 아래 샹들리에', hint: '샹들리에를 흔들어 아래층 세 고양이를 덮치기', target: { x: 780, y: 330 } },
      { name: '시계손 통로', hint: '시계손의 회전 방향을 따라 위층으로 진입하기', target: { x: 650, y: 400 } },
    ],
    story: { speaker: '종탑의 세 고양이', avatar: '🔔😾', text: '마지막 종이 울리기 전에 돌아가라냥!', chickReply: '종소리보다 빠르게 지나가겠어!', instruction: '시계손과 샹들리에가 만든 통로를 이용하세요.' },
    spawns: [
      { kind: 'clockHand', x: 650, y: 400, w: 210, h: 18, anchor: { x: 550, y: 400 }, angularSpeed: 0.42 },
      { kind: 'chandelier', x: 780, y: 330, w: 100, h: 36, anchor: { x: 780, y: 190 } },
      ...fort({ centerX: 940, lowerCats: 2, upperCat: true, upperShieldLayers: 1, baseMaterial: 'stone', extraTop: true }),
    ],
  }),
  11: makeStage(11, {
    region: 3, theme: 'factory-night', title: '공장 가동', ammo: 5,
    bonusChallenge: { timeLimitMs: 38000, bonusScore: 700, badge: '첫 생산품' },
    attackRoutes: [
      { name: '컨베이어 시작점', hint: '벨트 위 블록을 밀어 낮은 지지대를 부수기', target: { x: 700, y: 650 } },
      { name: '공장 상부 발판', hint: '컨베이어가 옮긴 물체를 위층 고양이에게 보내기', target: { x: 920, y: 454 } },
    ],
    story: { speaker: '공장 감독 고양이', avatar: '🏭🐱', text: '조립 라인은 멈추지 않는다냥!', chickReply: '벨트를 타고 공장을 거꾸로 돌리겠어!', instruction: '컨베이어는 위에 놓인 물체를 옆으로 밀어 줘요.' },
    spawns: [
      { kind: 'conveyor', x: 700, y: 650, w: 220, h: 18, forceX: 5 },
      ...fort({ centerX: 940, lowerCats: 2, upperCat: false, baseMaterial: 'steel' }),
    ],
  }),
  12: makeStage(12, {
    region: 3, theme: 'factory-night', title: '타이어 시험장', ammo: 5,
    bonusChallenge: { timeLimitMs: 40000, bonusScore: 750, badge: '반동 전문가' },
    attackRoutes: [
      { name: '타이어 반동', hint: '타이어를 밟고 높이 튀어 올라 윗층을 노리기', target: { x: 680, y: 630 } },
      { name: '벨트 끝 지지대', hint: '컨베이어로 블록을 옮겨 오른쪽 받침을 무너뜨리기', target: { x: 1018, y: 620 } },
    ],
    story: { speaker: '타이어 시험장 고양이', avatar: '🛞😼', text: '반동을 제어하지 못하면 빙글빙글 돈다냥!', chickReply: '이번엔 내가 튀어 오를 차례야!', instruction: '타이어의 반동으로 높이를 얻고 벨트로 구조물을 흔드세요.' },
    spawns: [
      { kind: 'tire', x: 680, y: 630, radius: 42 },
      { kind: 'conveyor', x: 760, y: 650, w: 200, h: 18, forceX: 4 },
      ...fort({ centerX: 970, lowerCats: 2, upperCat: true, baseMaterial: 'stone', upperMaterial: 'steel' }),
    ],
  }),
  13: makeStage(13, {
    region: 3, theme: 'factory-night', title: '기어 압착기', ammo: 4,
    bonusChallenge: { timeLimitMs: 42000, bonusScore: 800, badge: '기어 틈새' },
    attackRoutes: [
      { name: '회전 기어', hint: '기어 반동으로 방패 고양이의 옆을 노리기', target: { x: 620, y: 465 } },
      { name: '컨베이어 통로', hint: '벨트 위 발판으로 안전한 틈을 지나기', target: { x: 750, y: 650 } },
    ],
    story: { speaker: '압착기 담당 고양이', avatar: '⚙️🐈', text: '기어가 맞물리면 도망칠 틈도 없다냥!', chickReply: '기어가 비는 순간 통과하겠어!', instruction: '기어의 회전과 컨베이어의 이동 방향을 살피세요.' },
    spawns: [
      { kind: 'gear', x: 620, y: 465, radius: 50, angularSpeed: -0.035 },
      { kind: 'conveyor', x: 750, y: 650, w: 210, h: 18, forceX: 4.5 },
      ...fort({ centerX: 960, lowerCats: 2, shieldLayers: 1, upperCat: true, upperShieldLayers: 1, baseMaterial: 'stone', extraTop: true }),
    ],
  }),
  14: makeStage(14, {
    region: 3, theme: 'factory-night', title: '셔터 작업장', ammo: 4,
    bonusChallenge: { timeLimitMs: 44000, bonusScore: 850, badge: '셔터 돌파' },
    attackRoutes: [
      { name: '작업장 셔터', hint: '셔터가 열릴 때 벨트를 따라 안쪽을 맞히기', target: { x: 760, y: 430 } },
      { name: '분리된 블록 더미', hint: '왼쪽 받침을 끊어 두 더미를 연쇄로 무너뜨리기', target: { x: 825, y: 620 } },
    ],
    story: { speaker: '작업장 문지기', avatar: '🚪😾', text: '셔터가 닫히면 다시 열리지 않는다냥!', chickReply: '열리는 순간을 놓치지 않을게!', instruction: '셔터의 왕복 간격에 맞춰 컨베이어 구간을 통과하세요.' },
    spawns: [
      { kind: 'shutter', x: 760, y: 430, w: 24, h: 140, minY: 340, maxY: 500, speed: 2.2 },
      { kind: 'conveyor', x: 700, y: 650, w: 180, h: 18, forceX: 4 },
      ...fort({ centerX: 960, lowerCats: 2, upperCat: true, baseMaterial: 'steel', deckMaterial: 'stone' }),
      ...fort({ centerX: 1120, deckY: 600, width: 100, lowerCats: 1, baseMaterial: 'wood', deckMaterial: 'glass' }),
    ],
  }),
  15: makeStage(15, {
    region: 3, theme: 'factory-night', title: '마지막 조립 라인', ammo: 4,
    bonusChallenge: { timeLimitMs: 46000, bonusScore: 900, badge: '공장 탈출' },
    attackRoutes: [
      { name: '조립 벨트', hint: '벨트를 역이용해 받침 아래로 파고들기', target: { x: 700, y: 650 } },
      { name: '트램펄린 상단', hint: '트램펄린으로 튀어 올라 세 고양이의 받침을 노리기', target: { x: 650, y: 640 } },
    ],
    story: { speaker: '조립 라인 대장', avatar: '🏭😾', text: '공장 출구는 이 조립 라인 너머다냥!', chickReply: '마지막 벨트도 뛰어넘겠어!', instruction: '컨베이어와 트램펄린을 이어 높은 구조물을 공략하세요.' },
    spawns: [
      { kind: 'conveyor', x: 700, y: 650, w: 220, h: 18, forceX: 5 },
      { kind: 'gear', x: 600, y: 470, radius: 48, angularSpeed: 0.04 },
      { kind: 'trampoline', x: 650, y: 640, w: 120, h: 20 },
      ...fort({ centerX: 960, lowerCats: 2, upperCat: true, upperShieldLayers: 1, baseMaterial: 'steel', upperMaterial: 'stone', extraTop: true }),
    ],
  }),
  16: makeStage(16, {
    region: 4, theme: 'meadow-gold', title: '민들레 발사대', ammo: 5,
    bonusChallenge: { timeLimitMs: 40000, bonusScore: 900, badge: '꽃바람' },
    attackRoutes: [
      { name: '민들레 꽃받침', hint: '꽃받침을 밟아 위쪽 고양이에게 날아가기', target: { x: 650, y: 630 } },
      { name: '낮은 나무 기둥', hint: '낮은 기둥을 끊어 두 고양이의 발판 무너뜨리기', target: { x: 825, y: 620 } },
    ],
    story: { speaker: '초원 꽃지기', avatar: '🌼🐱', text: '민들레 바람은 용감한 병아리만 태운다냥!', chickReply: '꽃바람을 타고 올라갈게!', instruction: '꽃 발사대는 위에서 닿으면 병아리를 위로 띄워요.' },
    spawns: [
      { kind: 'flowerLauncher', x: 650, y: 640, radius: 34, forceY: 11 },
      ...fort({ centerX: 940, lowerCats: 1, upperCat: true, baseMaterial: 'wood', deckMaterial: 'stone' }),
      cat(1060, 452, 23),
    ],
  }),
  17: makeStage(17, {
    region: 4, theme: 'meadow-gold', title: '황금빛 시소', ammo: 4,
    bonusChallenge: { timeLimitMs: 42000, bonusScore: 950, badge: '균형 잡기' },
    attackRoutes: [
      { name: '시소 끝판', hint: '시소 한쪽을 눌러 반대편으로 튀어 오르기', target: { x: 700, y: 650 } },
      { name: '꽃 발사대', hint: '꽃받침으로 높이를 얻어 윗층을 직접 맞히기', target: { x: 620, y: 640 } },
    ],
    story: { speaker: '황금 시소지기', avatar: '⚖️😺', text: '균형을 잃으면 다시 바닥으로 떨어진다냥!', chickReply: '시소와 꽃바람을 한 번에 쓸게!', instruction: '시소의 반대편과 꽃 발사대는 서로 다른 상승 경로예요.' },
    spawns: [
      { kind: 'seesaw', x: 700, y: 650, w: 190, h: 14 },
      { kind: 'flowerLauncher', x: 620, y: 640, radius: 34, forceY: 12 },
      ...fort({ centerX: 960, lowerCats: 2, upperCat: true, upperShieldLayers: 1, baseMaterial: 'stone' }),
    ],
  }),
  18: makeStage(18, {
    region: 4, theme: 'meadow-gold', title: '바위 정원', ammo: 4,
    bonusChallenge: { timeLimitMs: 44000, bonusScore: 1000, badge: '정원 돌파' },
    attackRoutes: [
      { name: '정원 바위', hint: '바위를 굴려 방패 고양이의 아래쪽 받침을 깨기', target: { x: 720, y: 620 } },
      { name: '황금 꽃 발사대', hint: '꽃바람을 타고 위쪽 방패 뒤를 공략하기', target: { x: 620, y: 640 } },
    ],
    story: { speaker: '바위 정원사', avatar: '🪨🌼', text: '이 정원은 바위와 방패로 지켜진다냥!', chickReply: '바위보다 높이 날아갈 거야!', instruction: '바위의 힘과 꽃 발사대의 상승 궤적을 골라 쓰세요.' },
    spawns: [
      { kind: 'boulder', x: 720, y: 620, radius: 28, armed: true },
      { kind: 'flowerLauncher', x: 620, y: 640, radius: 34, forceY: 12 },
      ...fort({ centerX: 970, lowerCats: 2, shieldLayers: 1, upperCat: true, upperShieldLayers: 1, baseMaterial: 'stone', extraTop: true }),
    ],
  }),
  19: makeStage(19, {
    region: 4, theme: 'meadow-gold', title: '고양이 왕의 문턱', ammo: 4,
    bonusChallenge: { timeLimitMs: 46000, bonusScore: 1100, badge: '결전 준비' },
    attackRoutes: [
      { name: '황금 발사대', hint: '꽃 발사대로 단단한 윗층 방어를 넘어가기', target: { x: 620, y: 640 } },
      { name: '흔들리는 샹들리에', hint: '샹들리에를 흔들어 성문 안쪽을 무너뜨리기', target: { x: 780, y: 320 } },
    ],
    story: { speaker: '왕의 문지기', avatar: '👑😾', text: '이 문 너머에 고양이 왕이 기다린다냥!', chickReply: '마지막 길을 열고 왕을 만나겠어!', instruction: '꽃 발사대와 샹들리에로 결전 요새의 방어를 약화시키세요.' },
    spawns: [
      { kind: 'flowerLauncher', x: 620, y: 640, radius: 35, forceY: 12 },
      { kind: 'chandelier', x: 780, y: 320, w: 110, h: 38, anchor: { x: 780, y: 180 } },
      ...fort({ centerX: 970, lowerCats: 2, upperCat: true, upperShieldLayers: 2, baseMaterial: 'steel', upperMaterial: 'stone', extraTop: true }),
    ],
  }),
  20: makeStage(20, {
    region: 4, bossRole: 'final', theme: 'meadow-gold', title: '황금 초원의 고양이 왕', ammo: 5,
    bonusChallenge: { timeLimitMs: 60000, bonusScore: 1500, badge: '초원의 수호자' },
    attackRoutes: [
      { name: '왕의 아래 요새', hint: '아래쪽 강철 받침을 부숴 왕의 방어를 흔들기', target: { x: 850, y: 620 } },
      { name: '왕관 위 약점', hint: '샹들리에를 흔들어 왕관 위 약점을 맞히기', target: { x: 965, y: 285 } },
    ],
    story: { speaker: '황금 초원의 고양이 왕', avatar: '👑🐱', text: '내가 초원의 마지막 고양이 왕이다냥!', chickReply: '모두의 둥지를 되찾고 끝내겠어!', instruction: '아래 요새를 무너뜨린 뒤 샹들리에를 이용해 왕관 위 약점을 노리세요.' },
    spawns: [
      { kind: 'flowerLauncher', x: 620, y: 640, radius: 36, forceY: 13 },
      { kind: 'chandelier', x: 965, y: 230, w: 130, h: 42, anchor: { x: 965, y: 130 }, breakImpact: 22 },
      ...fort({ centerX: 965, lowerCats: 1, upperCat: false, baseMaterial: 'steel', deckMaterial: 'stone', extraTop: true }),
      block(880, 286, 26, 100, 'steel'), block(1050, 286, 26, 100, 'steel'),
      block(965, 318, 176, 20, 'wood'),
      cat(965, 275, 38, 0, true, 500),
      { kind: 'egg', x: 1210, y: 650 },
    ],
  }),
};
