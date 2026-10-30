import type { GameStage, ItemKind } from './types';

export const MAX_ITEM_COUNT = 2;

export const ITEM_INFO: Record<ItemKind, { label: string; icon: string; description: string }> = {
  mega: { label: '거대화 망치', icon: '🔨', description: '다음 병아리가 커져 구조물을 더 세게 부숴요.' },
  booster: { label: '치즈 로켓', icon: '🚀', description: '조준 중 켜면 다음 병아리, 비행 중 쓰면 현재 병아리의 속도를 크게 높여요.' },
  quake: { label: '달걀 지진', icon: '🥚', description: '요새 전체를 강하게 흔들어요. 조준 중 켜면 다음 발사와 함께 사용돼요.' },
  butter: { label: '탄환 보충', icon: '🧀', description: '조준 중 사용하면 병아리 탄환을 하나 더 받아요.' },
  cushion: { label: '알 쿠션', icon: '🛟', description: '알이 깨질 때 점수 감점을 한 번 막아요.' },
};

export const STAGE_CLEAR_REWARDS: Partial<Record<GameStage, ItemKind>> = {
  1: 'mega',
  2: 'booster',
  3: 'quake',
  4: 'butter',
  5: 'cushion',
};

export const emptyItemInventory = (): Record<ItemKind, number> => ({
  booster: 0, quake: 0, mega: 0, butter: 0, cushion: 0,
});
