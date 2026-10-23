import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorldMapScreen } from './WorldMapScreen';

afterEach(cleanup);

describe('WorldMapScreen best star ratings', () => {
  it('shows three fixed star slots with accessible best-rating text', () => {
    const { container } = render(<WorldMapScreen
      completedStages={[1, 2]}
      bestStars={{ 1: 2, 2: 3 }}
      challengeBadges={[2]}
      unlockedStage={3}
      onSelectStage={vi.fn()}
      onBack={vi.fn()}
      onOpenLeaderboard={vi.fn()}
    />);
    expect(screen.getByRole('img', { name: 'Stage 1 best stars 2 of 3' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Stage 2 best stars 3 of 3' })).toBeTruthy();
    expect(screen.getByLabelText('방패 무력화 배지 획득')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Stage 3 best stars 0 of 3' })).toBeTruthy();
    expect(container.querySelectorAll('.map-node-stars .map-star')).toHaveLength(18);
    expect(container.querySelectorAll('.map-node-stars .map-star.earned')).toHaveLength(5);
  });
});
