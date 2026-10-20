import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameModal } from './GameModal';
import { CHICK_FORMS } from '../game/constants';
import { STAGES } from '../game/stages';
import type { GameSnapshot } from '../game/types';

afterEach(cleanup);

function makeSnapshot(state: GameSnapshot['state'], defeatCause: GameSnapshot['defeatCause'] = null): GameSnapshot {
  return {
    screen: 'game', stage: 3, score: 4200, ammo: 0, campaignComplete: state === 'ENDING', state,
    items: { booster: 0, quake: 1, mega: 0 }, muted: false, entities: [], aimPosition: null,
    defeatCause, story: STAGES[3].story, form: CHICK_FORMS[3],
    evolvedForm: state === 'EVOLUTION' ? CHICK_FORMS[4] : null,
  };
}

describe('GameModal', () => {
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
    expect(screen.getByRole('heading', { name: '새로운 모습으로 진화!' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다음 챕터로' }));
    rerender(<GameModal snapshot={makeSnapshot('ENDING')} {...props} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
