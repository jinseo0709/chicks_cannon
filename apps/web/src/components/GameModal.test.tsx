import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameModal } from './GameModal';
import { CHICK_FORMS } from '../game/constants';
import { STAGES } from '../game/stages';
import type { GameSnapshot } from '../game/types';

afterEach(cleanup);

function makeSnapshot(state: GameSnapshot['state'], defeatCause: GameSnapshot['defeatCause'] = null, stars: GameSnapshot['stageStars'] = 0): GameSnapshot {
  return {
    screen: 'game', stage: 3, score: 4200, stageScore: 4200, scoreTarget: 6000, stageAmmo: 5, stageStars: stars,
    ammo: 0, campaignComplete: state === 'ENDING', state,
    items: { booster: 0, quake: 1, mega: 0, butter: 1 }, muted: false, entities: [], aimPosition: null,
    targetingItem: null, slickZones: [],
    defeatCause, story: STAGES[3].story, form: CHICK_FORMS[3],
    evolvedForm: state === 'EVOLUTION' ? CHICK_FORMS[4] : null,
  };
}

describe('GameModal', () => {
  it.each([1, 2, 3] as const)('shows the engine-calculated %s-star clear rating and stage score', (stars) => {
    const { container } = render(<GameModal snapshot={makeSnapshot('WON', null, stars)} onRetry={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.getByRole('img', { name: `Stage stars ${stars} of 3` })).toBeTruthy();
    expect(container.querySelectorAll('.clear-star.earned')).toHaveLength(stars);
    expect(container.querySelector('.clear-result')?.textContent).toBe('Stage score 4,200 / target 6,000');
  });

  it('distinguishes an egg failure and an ammo failure and retries', () => {
    const onRetry = vi.fn();
    const props = { onRetry, onContinue: vi.fn() };
    const { rerender } = render(<GameModal snapshot={makeSnapshot('LOST', 'hostage')} {...props} />);
    expect(screen.getByRole('heading', { name: '인질 달걀이 깨졌어요' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '챕터 다시 도전' }));
    rerender(<GameModal snapshot={makeSnapshot('LOST', 'ammo')} {...props} />);
    expect(screen.getByRole('heading', { name: '둥지 탈환에 실패했어요' })).toBeTruthy();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows evolution and final score actions for campaign completion', () => {
    const onContinue = vi.fn();
    const props = { onRetry: vi.fn(), onContinue };
    const { rerender } = render(<GameModal snapshot={makeSnapshot('EVOLUTION')} {...props} />);
    expect(screen.getByRole('heading', { name: '다음 길이 열렸어요!' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '월드맵에서 확인' }));
    rerender(<GameModal snapshot={makeSnapshot('ENDING')} {...props} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
