import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./components/GameCanvas', () => ({
  GameCanvas: () => <div aria-label="게임 캔버스 자리표시자" />,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.removeItem('chicks-cannon-world-progress-v1');
});

describe('App navigation and campaign entry', () => {
  it('restores the best star rating on the world map after remounting', () => {
    localStorage.setItem('chicks-cannon-world-progress-v1', JSON.stringify({
      version: 2,
      completedStages: [1, 2],
      bestStars: { 1: 2, 2: 3 },
    }));
    const firstMount = render(<App />);
    fireEvent.click(firstMount.container.querySelector('.opening-screen button')!);
    fireEvent.click(firstMount.container.querySelector('.home-play-button')!);
    expect(screen.getByRole('img', { name: 'Stage 1 best stars 2 of 3' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Stage 2 best stars 3 of 3' })).toBeTruthy();
    firstMount.unmount();

    const secondMount = render(<App />);
    fireEvent.click(secondMount.container.querySelector('.opening-screen button')!);
    fireEvent.click(secondMount.container.querySelector('.home-play-button')!);
    expect(screen.getByRole('img', { name: 'Stage 1 best stars 2 of 3' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Stage 2 best stars 3 of 3' })).toBeTruthy();
  });

  it('renders the home title and starts a story-led game session', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '우리 둥지를 빼앗겼다!' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '이야기 시작' }));
    expect(screen.getByRole('heading', { name: '병아리 대포' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '모험 계속하기' }));
    fireEvent.click(screen.getByRole('button', { name: '출발하기' }));
    expect(screen.getByRole('dialog', { name: '골목대장 길고양이' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '도전 시작' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '도전 시작' }));
    expect(screen.getByRole('region', { name: '게임 정보' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '현재 챕터 다시 시작' })).toBeTruthy();
  });

  it('opens the paginated leaderboard and returns home', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '이야기 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '순위표 열기' }));
    expect(await screen.findByRole('heading', { name: '모험가 순위표' })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: '아직 등록된 기록이 없어요' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '← 돌아가기' }));
    expect(screen.getByRole('heading', { name: '병아리 대포' })).toBeTruthy();
  });
});
