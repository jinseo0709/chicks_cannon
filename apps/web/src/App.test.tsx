import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./components/GameCanvas', () => ({
  GameCanvas: () => <div aria-label="게임 캔버스 자리표시자" />,
}));

afterEach(cleanup);

describe('App navigation and campaign entry', () => {
  it('renders the home title and starts a story-led game session', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '병아리 대포' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '모험 시작' }));
    expect(screen.getByRole('dialog', { name: '골목대장 길고양이' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '도전 시작' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '도전 시작' }));
    expect(screen.getByRole('region', { name: '게임 정보' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '현재 챕터 다시 시작' })).toBeTruthy();
  });

  it('keeps a leaderboard entry point and returns home from the placeholder', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '순위표' }));
    expect(screen.getByRole('heading', { name: '모험가 순위표' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '홈으로' }));
    expect(screen.getByRole('heading', { name: '병아리 대포' })).toBeTruthy();
  });
});
