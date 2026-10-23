import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameHud } from './GameHud';
import { CHICK_FORMS } from '../game/constants';
import { STAGES } from '../game/stages';
import type { GameSnapshot } from '../game/types';

const makeSnapshot = (state: GameSnapshot['state'] = 'AIMING'): GameSnapshot => ({
  screen: 'game', stage: 1, score: 1200, stageScore: 1200, scoreTarget: 3600, stageAmmo: 6, stageStars: 0, bonusChallengeRemainingMs: 65000, bonusChallengeStatus: 'ready',
  ammo: 2, campaignComplete: false, state,
  items: { booster: 1, quake: 1, mega: 1, butter: 1, cushion: 1 }, eggCushionActive: false, finalRewardClaimed: false,
  muted: false, entities: [], aimPosition: null,
  targetingItem: null, slickZones: [],
  defeatCause: null, story: STAGES[1].story, form: CHICK_FORMS[1], evolvedForm: null,
});

afterEach(cleanup);

describe('GameHud', () => {
  it('shows campaign values and routes mute, restart and available item actions', () => {
    const onRestart = vi.fn();
    const onMute = vi.fn();
    const onUseItem = vi.fn();
    const onTogglePause = vi.fn();
    const { container } = render(<GameHud snapshot={makeSnapshot('FLYING')} onRestart={onRestart} onMute={onMute} onUseItem={onUseItem} onTogglePause={onTogglePause} />);
    expect(container.querySelector('.stage-score-value')?.textContent).toBe('1,200점');
    expect(screen.getByLabelText('남은 병아리 2개')).toBeTruthy();
    expect(screen.getByLabelText('사용 아이템').className).toBe('item-tray');
    expect(screen.getByRole('button', { name: '달걀 지진, 남은 1개' }).textContent).toContain('1');
    expect(screen.getByRole('button', { name: '치즈 로켓, 남은 1개' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByLabelText('거대화 망치, 남은 1개').hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '소리 끄기' }));
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
    fireEvent.click(screen.getByRole('button', { name: '현재 챕터 다시 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '치즈 로켓, 남은 1개' }));
    fireEvent.click(screen.getByRole('button', { name: '달걀 지진, 남은 1개' }));
    fireEvent.click(screen.getByRole('button', { name: '버터 스프레이, 남은 1개' }));
    expect(onMute).toHaveBeenCalledOnce();
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onUseItem).toHaveBeenCalledWith('booster');
    expect(onUseItem).toHaveBeenCalledWith('quake');
    expect(onUseItem).toHaveBeenCalledWith('butter');
    expect(onTogglePause).toHaveBeenCalledOnce();
  });

  it('makes all background HUD controls inert and disabled while the pause modal is active', () => {
    const onTogglePause = vi.fn();
    const { container } = render(<GameHud snapshot={makeSnapshot('PAUSED')} onRestart={vi.fn()} onMute={vi.fn()} onUseItem={vi.fn()} onTogglePause={onTogglePause} />);
    expect(container.querySelector('.game-hud')?.hasAttribute('inert')).toBe(true);
    expect([...container.querySelectorAll('button')].every((button) => button.disabled)).toBe(true);
    expect(screen.queryByRole('button')).toBeNull();
    expect(onTogglePause).not.toHaveBeenCalled();
  });

  it('keeps compact item buttons inside the top HUD bar', () => {
    const { container } = render(<GameHud snapshot={makeSnapshot('FLYING')} onRestart={vi.fn()} onMute={vi.fn()} onUseItem={vi.fn()} onTogglePause={vi.fn()} />);
    const hud = container.querySelector('.game-hud');
    expect([...hud!.children].map((child) => child.id)).toEqual(['top-bar']);
    const topline = container.querySelector('#top-bar');
    expect([...topline!.children].map((child) => child.className)).toEqual(['hud-card chapter-card', 'hud-card score-card', 'hud-card ammo-card', 'item-tray', 'hud-actions']);
    expect(container.querySelector('#item-bar')?.querySelectorAll('button')).toHaveLength(5);
    expect(container.querySelector('[aria-label="치즈 로켓, 남은 1개"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="달걀 지진, 남은 1개"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="거대화 망치, 남은 1개"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="알 쿠션, 남은 1개"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="소리 끄기"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="일시정지"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="현재 챕터 다시 시작"]')).toBeTruthy();
    expect(container.querySelectorAll('.item-label')).toHaveLength(5);
  });

  it('shows stage score progress prominently and keeps campaign total secondary', () => {
    const { container } = render(<GameHud snapshot={makeSnapshot()} onRestart={vi.fn()} onMute={vi.fn()} onUseItem={vi.fn()} onTogglePause={vi.fn()} />);
    expect(container.querySelector('.score-card .stage-score-value')?.textContent).toBe('1,200점');
    expect(container.querySelector('.score-target-label')?.textContent).toBe('⭐ 별 3개 목표 1,200 / 3,600');
    expect(container.querySelector('.score-target-track')?.getAttribute('aria-valuenow')).toBe('33');
    expect(container.querySelector('.campaign-score')?.textContent).toBe('🏆 모험 누적 1,200점');
  });

  it('clamps the score progress bar after the target while retaining the actual score', () => {
    const snapshot = { ...makeSnapshot(), stageScore: 5000 };
    const { container } = render(<GameHud snapshot={snapshot} onRestart={vi.fn()} onMute={vi.fn()} onUseItem={vi.fn()} onTogglePause={vi.fn()} />);
    expect(container.querySelector('.score-target-track')?.getAttribute('aria-valuenow')).toBe('100');
    expect(container.querySelector('.stage-score-value')?.textContent).toBe('5,000점');
  });

  it('shows an armed egg cushion and keeps its effect one-use', () => {
    const snapshot = { ...makeSnapshot(), eggCushionActive: true, items: { ...makeSnapshot().items, cushion: 0 } };
    const { container } = render(<GameHud snapshot={snapshot} onRestart={vi.fn()} onMute={vi.fn()} onUseItem={vi.fn()} onTogglePause={vi.fn()} />);
    const cushion = container.querySelector<HTMLButtonElement>('[aria-pressed="true"][aria-label^="알 쿠션"]');
    expect(cushion?.getAttribute('aria-label')).toBe('알 쿠션, 남은 0개, 알 보호 중');
    expect(cushion?.disabled).toBe(true);
  });

  it('labels the selected butter item and allows the aiming mega action', () => {
    const onUseItem = vi.fn();
    const snapshot = { ...makeSnapshot(), targetingItem: 'butter' as const };
    const { rerender } = render(<GameHud snapshot={snapshot} onRestart={vi.fn()} onMute={vi.fn()} onUseItem={onUseItem} onTogglePause={vi.fn()} />);
    expect(screen.getByRole('button', { name: '버터 스프레이, 남은 1개' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '거대화 망치, 남은 1개' }));
    expect(onUseItem).toHaveBeenCalledWith('mega');
    rerender(<GameHud snapshot={{ ...snapshot, targetingItem: null, items: { ...snapshot.items, butter: 0 } }} onRestart={vi.fn()} onMute={vi.fn()} onUseItem={onUseItem} onTogglePause={vi.fn()} />);
    expect(screen.getByRole('button', { name: '버터 스프레이, 남은 0개' }).hasAttribute('disabled')).toBe(true);
  });
});
