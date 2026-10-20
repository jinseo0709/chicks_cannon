import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameHud } from './GameHud';
import { CHICK_FORMS } from '../game/constants';
import { STAGES } from '../game/stages';
import type { GameSnapshot } from '../game/types';

const makeSnapshot = (state: GameSnapshot['state'] = 'AIMING'): GameSnapshot => ({
  screen: 'game', stage: 1, score: 1200, ammo: 2, campaignComplete: false, state,
  items: { booster: 1, quake: 1, mega: 1 }, muted: false, entities: [], aimPosition: null,
  defeatCause: null, story: STAGES[1].story, form: CHICK_FORMS[1], evolvedForm: null,
});

describe('GameHud', () => {
  it('shows campaign values and routes mute, restart and available item actions', () => {
    const onRestart = vi.fn();
    const onMute = vi.fn();
    const onUseItem = vi.fn();
    const onTogglePause = vi.fn();
    render(<GameHud snapshot={makeSnapshot('FLYING')} onRestart={onRestart} onMute={onMute} onUseItem={onUseItem} onTogglePause={onTogglePause} />);
    expect(screen.getByText('점수 1,200')).toBeTruthy();
    expect(screen.getByLabelText('남은 병아리 2개')).toBeTruthy();
    expect(screen.getByLabelText('사용 아이템').className).toBe('item-tray');
    expect(screen.getByRole('button', { name: '달걀 지진, 남은 1개' }).textContent).toContain('1');
    expect(screen.getByRole('button', { name: '치즈 로켓, 남은 1개' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: '거대화, 남은 1개' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '소리 끄기' }));
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
    fireEvent.click(screen.getByRole('button', { name: '현재 챕터 다시 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '치즈 로켓, 남은 1개' }));
    expect(onMute).toHaveBeenCalledOnce();
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onUseItem).toHaveBeenCalledWith('booster');
    expect(onTogglePause).toHaveBeenCalledOnce();
  });

  it('labels the pause control as resume while paused', () => {
    const onTogglePause = vi.fn();
    render(<GameHud snapshot={makeSnapshot('PAUSED')} onRestart={vi.fn()} onMute={vi.fn()} onUseItem={vi.fn()} onTogglePause={onTogglePause} />);
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    expect(onTogglePause).toHaveBeenCalledOnce();
  });

  it('groups chapter, items and controls into one accessible top bar', () => {
    const { container } = render(<GameHud snapshot={makeSnapshot('FLYING')} onRestart={vi.fn()} onMute={vi.fn()} onUseItem={vi.fn()} onTogglePause={vi.fn()} />);
    const topline = container.querySelector('.hud-topline');
    expect([...topline!.children].map((child) => child.className)).toEqual(['hud-left', 'item-tray', 'hud-actions']);
    expect(container.querySelector('[aria-label="치즈 로켓, 남은 1개"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="달걀 지진, 남은 1개"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="거대화, 남은 1개"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="소리 끄기"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="일시정지"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="현재 챕터 다시 시작"]')).toBeTruthy();
    expect(container.querySelectorAll('.item-label')).toHaveLength(3);
  });
});
