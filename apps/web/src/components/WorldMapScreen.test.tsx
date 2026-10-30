import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorldMapScreen, type WorldMapScreenProps } from './WorldMapScreen';
import { REGIONS, STAGE_ORDER } from '../game/constants';

afterEach(cleanup);

function props(overrides: Partial<WorldMapScreenProps> = {}): WorldMapScreenProps {
  return {
    completedStages: [],
    bestStars: {},
    challengeBadges: [],
    unlockedStage: 1,
    selectedRegion: 1,
    onSelectRegion: vi.fn(),
    onSelectStage: vi.fn(),
    onBack: vi.fn(),
    onOpenLeaderboard: vi.fn(),
    ...overrides,
  };
}

describe('WorldMapScreen regional pages', () => {
  it.each([1, 2, 3, 4] as const)('shows exactly five stage nodes for region %s', (region) => {
    const { container } = render(<WorldMapScreen {...props({ selectedRegion: region })} />);
    const info = REGIONS[region];
    expect(screen.getByRole('heading', { name: info.title })).toBeTruthy();
    expect(container.querySelectorAll('.map-level-node')).toHaveLength(5);
    expect(container.querySelectorAll('.map-node-stars .map-star')).toHaveLength(15);
    expect(container.querySelector('.world-map-screen')?.classList).toContain(`region-${region}`);
  });

  it('shows fixed best star slots and earned challenge badges', () => {
    const { container } = render(<WorldMapScreen {...props({ completedStages: [1, 2], bestStars: { 1: 2, 2: 3 }, challengeBadges: [2], unlockedStage: 3 })} />);
    expect(screen.getByRole('img', { name: 'Stage 1 best stars 2 of 3' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Stage 2 best stars 3 of 3' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Stage 3 best stars 0 of 3' })).toBeTruthy();
    expect(container.querySelectorAll('.map-node-stars .map-star.earned')).toHaveLength(5);
    expect(container.querySelector('.map-challenge-badge')?.getAttribute('aria-label')).toContain('배지 획득');
  });

  it('disables previous/next navigation at the region boundaries', () => {
    const { rerender } = render(<WorldMapScreen {...props({ selectedRegion: 1 })} />);
    expect(screen.getByRole('button', { name: '이전 지역' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '다음 지역' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByLabelText('지역 선택').querySelector('[aria-current="page"]')).toBeTruthy();
    const onSelectRegion = vi.fn();
    rerender(<WorldMapScreen {...props({ selectedRegion: 2, onSelectRegion })} />);
    fireEvent.click(screen.getByRole('button', { name: '이전 지역' }));
    expect(onSelectRegion).toHaveBeenCalledWith(1);
    rerender(<WorldMapScreen {...props({ selectedRegion: 4, onSelectRegion })} />);
    expect(screen.getByRole('button', { name: '다음 지역' }).hasAttribute('disabled')).toBe(true);
  });

  it('keeps stage availability sequential while allowing completed-stage replay', () => {
    const onSelectStage = vi.fn();
    const { container } = render(<WorldMapScreen {...props({ completedStages: [1, 2], unlockedStage: 3, onSelectStage })} />);
    const stage3 = screen.getByRole('button', { name: /스테이지 3,/ });
    const stage4 = screen.getByRole('button', { name: /스테이지 4,/ });
    const stage2 = screen.getByRole('button', { name: /스테이지 2,/ });
    expect(stage3.hasAttribute('disabled')).toBe(false);
    expect(stage4.hasAttribute('disabled')).toBe(true);
    fireEvent.click(stage4);
    expect(onSelectStage).not.toHaveBeenCalled();
    fireEvent.click(stage2);
    expect(onSelectStage).toHaveBeenCalledWith(2);
    expect(container.querySelector('.map-level-node.completed')).toBeTruthy();
  });

  it('offers a jump to the region containing the current stage', () => {
    const onSelectRegion = vi.fn();
    const onSelectStage = vi.fn();
    render(<WorldMapScreen {...props({ selectedRegion: 4, unlockedStage: 7, onSelectRegion, onSelectStage })} />);
    expect(screen.getByText(/현재 스테이지 · CHAPTER 7/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: `${REGIONS[2].title}로 이동` }));
    expect(onSelectRegion).toHaveBeenCalledWith(2);
    expect(onSelectStage).not.toHaveBeenCalled();
  });

  it('keeps 20-stage progress campaign-wide and resumes at the final completed stage', () => {
    const { rerender } = render(<WorldMapScreen {...props()} />);
    expect(screen.getByText('0 / 20')).toBeTruthy();
    const completed = STAGE_ORDER;
    rerender(<WorldMapScreen {...props({ completedStages: completed, unlockedStage: 20, selectedRegion: 4 })} />);
    expect(screen.getByText('20 / 20')).toBeTruthy();
    expect(screen.getByRole('heading', { name: REGIONS[4].title })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /고양이 왕/ })).toBeTruthy();
    const onSelectStage = vi.fn();
    rerender(<WorldMapScreen {...props({ completedStages: completed, unlockedStage: 20, selectedRegion: 4, onSelectStage })} />);
    fireEvent.click(screen.getByRole('button', { name: '다시 도전' }));
    expect(onSelectStage).toHaveBeenCalledWith(20);
  });
});
