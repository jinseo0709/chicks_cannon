import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameModal } from './GameModal';
import { CHICK_FORMS } from '../game/constants';
import { STAGES } from '../game/stages';
import type { GameSnapshot } from '../game/types';

afterEach(cleanup);

function makeSnapshot(state: GameSnapshot['state'], defeatCause: GameSnapshot['defeatCause'] = null, stars: GameSnapshot['stageStars'] = 0, stage: GameSnapshot['stage'] = 3): GameSnapshot {
  return {
    screen: 'game', stage, score: 4200, stageScore: 4200, scoreTarget: 6000, stageAmmo: STAGES[stage].ammo, stageStars: stars, bonusChallengeRemainingMs: 80000, bonusChallengeStatus: 'ready',
    ammo: 0, campaignComplete: state === 'ENDING', state,
    items: { booster: 0, quake: 1, mega: 0, butter: 1, cushion: 0 }, eggCushionActive: false, finalRewardClaimed: false,
    muted: false, entities: [], aimPosition: null, megaNext: false,
    targetingItem: null, slickZones: [],
    defeatCause, story: STAGES[stage].story, form: CHICK_FORMS[stage],
    evolvedForm: state === 'EVOLUTION' && stage < 20 ? CHICK_FORMS[(stage + 1) as keyof typeof CHICK_FORMS] : null,
  };
}

describe('GameModal', () => {
  it('shows the stage badge when the timed bonus challenge succeeds', () => {
    const snapshot = { ...makeSnapshot('EVOLUTION', null, 2, 5), bonusChallengeStatus: 'success' as const };
    render(<GameModal snapshot={snapshot} onRetry={vi.fn()} onNextStage={vi.fn()} onWorldMap={vi.fn()} />);
    expect(document.querySelector('.challenge-badge')?.textContent).toContain(STAGES[5].bonusChallenge.badge);
    expect(document.querySelector('.challenge-badge')?.textContent).toContain('+500점');
  });

  it.each([1, 3, 5, 6, 10, 15] as const)('does not show a clear popup for stage %s', (stage) => {
    const snapshot = makeSnapshot('WON', null, 2, stage);
    const { container } = render(<GameModal snapshot={snapshot} onRetry={vi.fn()} onNextStage={vi.fn()} onWorldMap={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('removes the short WON popup but keeps the stage action popup', () => {
    const props = { onRetry: vi.fn(), onNextStage: vi.fn(), onWorldMap: vi.fn() };
    const { rerender } = render(<GameModal snapshot={makeSnapshot('WON', null, 2, 3)} {...props} />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<GameModal snapshot={makeSnapshot('WON', null, 2, 5)} {...props} />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<GameModal snapshot={makeSnapshot('WON', null, 2, 6)} {...props} />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<GameModal snapshot={makeSnapshot('EVOLUTION', null, 2, 6)} {...props} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: '다음 스테이지' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '월드맵' })).toBeTruthy();
  });

  it('shows the region unlock popup at the end of a region', () => {
    render(<GameModal snapshot={makeSnapshot('EVOLUTION', null, 2, 5)} onRetry={vi.fn()} onNextStage={vi.fn()} onWorldMap={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '새 지역이 열렸어요!' })).toBeTruthy();
  });

  it('distinguishes an egg failure and an ammo failure and retries', () => {
    const onRetry = vi.fn();
    const props = { onRetry, onNextStage: vi.fn(), onWorldMap: vi.fn() };
    const { rerender } = render(<GameModal snapshot={makeSnapshot('LOST', 'hostage')} {...props} />);
    expect(screen.getByRole('heading', { name: '인질 달걀이 깨졌어요' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '챕터 다시 도전' }));
    rerender(<GameModal snapshot={makeSnapshot('LOST', 'ammo')} {...props} />);
    expect(screen.getByRole('heading', { name: '둥지 탈환에 실패했어요' })).toBeTruthy();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('explains that the stage timer expired', () => {
    const { container } = render(<GameModal snapshot={makeSnapshot('LOST', 'timer')} onRetry={vi.fn()} onNextStage={vi.fn()} onWorldMap={vi.fn()} />);
    expect(container.querySelector('#defeat-title')?.textContent).toContain('시간이 다 됐어요');
    expect(container.querySelector('.modal-card > p:nth-of-type(2)')?.textContent).toContain('시간 안에');
  });

  it('shows evolution and final score actions for campaign completion', () => {
    const onNextStage = vi.fn();
    const onWorldMap = vi.fn();
    const props = { onRetry: vi.fn(), onNextStage, onWorldMap };
    const { rerender } = render(<GameModal snapshot={makeSnapshot('EVOLUTION', null, 2, 5)} {...props} />);
    expect(screen.getByRole('heading', { name: '새 지역이 열렸어요!' })).toBeTruthy();
    expect(screen.getByText('알 쿠션 1개 획득!')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다음 스테이지' }));
    fireEvent.click(screen.getByRole('button', { name: '월드맵' }));
    rerender(<GameModal snapshot={makeSnapshot('ENDING')} {...props} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onNextStage).toHaveBeenCalledOnce();
    expect(onWorldMap).toHaveBeenCalledOnce();
  });
});
