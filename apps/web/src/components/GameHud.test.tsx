import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameHud } from './GameHud';
import { CHICK_FORMS } from '../game/constants';
import { STAGES } from '../game/stages';
import type { GameSnapshot } from '../game/types';

const makeSnapshot = (state: GameSnapshot['state'] = 'AIMING'): GameSnapshot => ({
  screen: 'game', stage: 1, score: 1200, stageScore: 1200, scoreTarget: 3600, stageAmmo: 6, stageStars: 0,
  bonusChallengeRemainingMs: 28000, bonusChallengeStatus: 'ready', ammo: 2, campaignComplete: false, state,
  items: { booster: 1, quake: 1, mega: 1, butter: 1, cushion: 1 }, eggCushionActive: false, finalRewardClaimed: false,
  muted: false, entities: [], aimPosition: null, megaNext: false, targetingItem: null, slickZones: [],
  defeatCause: null, story: STAGES[1].story, form: CHICK_FORMS[1], evolvedForm: null,
});

const props = () => ({ onRestart: vi.fn(), onMute: vi.fn(), onUseItem: vi.fn(), onTogglePause: vi.fn() });

afterEach(cleanup);

describe('GameHud', () => {
  it('marks the timer urgent when ten seconds or less remain', () => {
    const urgent = { ...makeSnapshot('AIMING'), bonusChallengeRemainingMs: 9500, bonusChallengeStatus: 'running' as const };
    const { container, rerender } = render(<GameHud snapshot={urgent} {...props()} />);
    expect(container.querySelector('.hud-timer-badge')?.classList.contains('urgent')).toBe(true);
    rerender(<GameHud snapshot={{ ...urgent, bonusChallengeRemainingMs: 10500 }} {...props()} />);
    expect(container.querySelector('.hud-timer-badge')?.classList.contains('urgent')).toBe(false);
  });

  it('shows stage score and routes active controls', () => {
    const actions = props();
    const { container } = render(<GameHud snapshot={makeSnapshot('FLYING')} {...actions} />);
    expect(container.querySelector('.stage-score-value')?.textContent).toBe('1,200점');
    expect(container.querySelector('.score-target-track')?.getAttribute('aria-valuenow')).toBe('33');
    expect(screen.getByLabelText('남은 병아리 2개')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '소리 끄기' }));
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
    fireEvent.click(screen.getByRole('button', { name: '현재 챕터 다시 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '치즈 로켓, remaining 1, key 1' }));
    fireEvent.click(screen.getByRole('button', { name: '달걀 지진, remaining 1, key 2' }));
    fireEvent.click(screen.getByRole('button', { name: '버터 스프레이, remaining 1, key 4' }));
    expect(actions.onMute).toHaveBeenCalledOnce();
    expect(actions.onTogglePause).toHaveBeenCalledOnce();
    expect(actions.onRestart).toHaveBeenCalledOnce();
    expect(actions.onUseItem).toHaveBeenCalledWith('booster');
    expect(actions.onUseItem).toHaveBeenCalledWith('quake');
    expect(actions.onUseItem).toHaveBeenCalledWith('butter');
  });

  it('disables controls while the pause modal is active', () => {
    const actions = props();
    const { container } = render(<GameHud snapshot={makeSnapshot('PAUSED')} {...actions} />);
    expect(container.querySelector('.game-hud')?.hasAttribute('inert')).toBe(true);
    expect([...container.querySelectorAll('button')].every((button) => button.disabled)).toBe(true);
  });

  it('keeps the item dock separate from the top bar', () => {
    const { container } = render(<GameHud snapshot={makeSnapshot('FLYING')} {...props()} />);
    expect([...container.querySelector('.game-hud')!.children].map((child) => child.id)).toEqual(['top-bar', 'item-bar']);
    expect(container.querySelector('#item-bar')?.querySelectorAll('button')).toHaveLength(5);
    expect(container.querySelectorAll('.item-button .item-label')).toHaveLength(4);
  });

  it('clamps score progress without changing the displayed score', () => {
    const snapshot = { ...makeSnapshot(), stageScore: 5000 };
    const { container } = render(<GameHud snapshot={snapshot} {...props()} />);
    expect(container.querySelector('.score-target-track')?.getAttribute('aria-valuenow')).toBe('100');
    expect(container.querySelector('.stage-score-value')?.textContent).toBe('5,000점');
  });

  it('explains that the flight skill needs a nearby cat', () => {
    const snapshot = {
      ...makeSnapshot('FLYING'),
      entities: [
        { id: -1, kind: 'chick' as const, x: 160, y: 525, angle: 0, alive: true },
        { id: 10, kind: 'cat' as const, x: 900, y: 500, angle: 0, alive: true },
      ],
    };
    const actions = props();
    const { container, rerender } = render(<GameHud snapshot={snapshot} {...actions} />);
    expect(container.querySelector('.skill-guide')?.textContent).toContain('고양이에게 가까이 가면');
    rerender(<GameHud snapshot={{ ...snapshot, entities: [snapshot.entities[0], { ...snapshot.entities[1], x: 300, y: 525 }] }} {...actions} />);
    expect(container.querySelector('.skill-guide')?.textContent).toContain(snapshot.form.skillName);
  });

  it.each([[6, '중간 보스'], [20, '최종 보스']] as const)('shows the %s boss health panel', (stage, label) => {
    const snapshot = { ...makeSnapshot(), stage, bossHp: 260, bossMaxHp: 500 } as GameSnapshot;
    const { container } = render(<GameHud snapshot={snapshot} {...props()} />);
    expect(container.querySelector('.boss-health-panel')?.textContent).toContain(label);
    expect(container.querySelector('.boss-health-track')?.getAttribute('aria-valuenow')).toBe('260');
  });

  it('shows an active egg cushion and prevents using it twice', () => {
    const snapshot = { ...makeSnapshot(), eggCushionActive: true, items: { ...makeSnapshot().items, cushion: 0 } };
    render(<GameHud snapshot={snapshot} {...props()} />);
    const cushion = screen.getByRole('button', { name: '알 쿠션, count 0, active' });
    expect(cushion.hasAttribute('disabled')).toBe(true);
  });

  it('labels selected items and allows a remaining aiming action', () => {
    const actions = props();
    const snapshot = { ...makeSnapshot(), targetingItem: 'butter' as const, megaNext: true };
    render(<GameHud snapshot={snapshot} {...actions} />);
    expect(screen.getByRole('button', { name: '버터 스프레이, remaining 1, key 4' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '거대화 망치, remaining 1, key 3' }));
    expect(actions.onUseItem).toHaveBeenCalledWith('mega');
  });
});
