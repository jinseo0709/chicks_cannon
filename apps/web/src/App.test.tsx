import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(cleanup);

describe('App home shell', () => {
  it('renders the game title and primary navigation', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '병아리 대포' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '모험 시작' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '순위표' })).toBeTruthy();
  });

  it('switches to the game placeholder when play is selected', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '모험 시작' }));

    expect(screen.getByRole('heading', { name: '게임 장면을 준비하고 있어요' })).toBeTruthy();
  });

  it('opens and leaves the leaderboard placeholder', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '순위표' }));
    expect(screen.getByRole('heading', { name: '모험가 순위표' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '홈으로' }));
    expect(screen.getByRole('heading', { name: '병아리 대포' })).toBeTruthy();
  });
});
