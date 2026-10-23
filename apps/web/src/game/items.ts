import type { GameStage, ItemKind } from './types';

export const MAX_ITEM_COUNT = 2;

export const ITEM_INFO: Record<ItemKind, { label: string; icon: string; description: string }> = {
  mega: { label: '거대화 망치', icon: '🔨', description: '다음 병아리가 커져 구조물을 더 세게 부숴요.' },
  booster: { label: '치즈 로켓', icon: '🚀', description: '날아가는 병아리의 속도를 크게 올려요.' },
  quake: { label: '달걀 지진', icon: '🥚', description: '요새 전체를 흔들어 연쇄 붕괴를 노려요.' },
  butter: { label: '버터 스프레이', icon: '🧈', description: '블록이나 바닥을 미끄럽게 만들어요.' },
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
