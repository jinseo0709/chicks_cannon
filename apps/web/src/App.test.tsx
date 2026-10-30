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
  localStorage.removeItem('chicks-cannon:nickname:v1');
  localStorage.removeItem('chicks-cannon:participant-id:v1');
  localStorage.removeItem('chicks-cannon:local-leaderboard:v1');
});

function startFromOpening(): void {
  fireEvent.change(screen.getByRole('textbox', { name: '랭킹에 표시할 닉네임' }), { target: { value: '테스트모험가' } });
  fireEvent.click(screen.getByRole('button', { name: '이야기 시작' }));
}

describe('App navigation and campaign entry', () => {
  it('toggles sound from the opening screen before gameplay starts', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '소리 끄기' }));
    expect(screen.getByRole('button', { name: '소리 켜기' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '소리 켜기' }));
    expect(screen.getByRole('button', { name: '소리 끄기' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('restores saved stars and completion when the app loads', () => {
    localStorage.setItem('chicks-cannon-world-progress-v1', JSON.stringify({
      version: 3,
      completedStages: [1, 2],
      bestStars: { 1: 2, 2: 3 },
      challengeBadges: [2],
    }));
    const firstMount = render(<App />);
    startFromOpening();
    fireEvent.click(firstMount.container.querySelector('.home-play-button')!);
    expect(screen.getByRole('img', { name: 'Stage 1 best stars 2 of 3' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Stage 2 best stars 3 of 3' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('chicks-cannon-world-progress-v1')!).version).toBe(4);
    firstMount.unmount();

    const secondMount = render(<App />);
    startFromOpening();
    fireEvent.click(secondMount.container.querySelector('.home-play-button')!);
    expect(screen.getByRole('img', { name: 'Stage 1 best stars 2 of 3' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Stage 2 best stars 3 of 3' })).toBeTruthy();
  });

  it('resumes stage 6 on region 2 and retains the selected region during navigation', () => {
    localStorage.setItem('chicks-cannon-world-progress-v1', JSON.stringify({
      version: 4,
      completedStages: [1, 2, 3, 4, 5],
      bestStars: { 1: 2, 2: 2, 3: 3, 4: 1, 5: 3 },
      challengeBadges: [5],
    }));
    const { container } = render(<App />);
    startFromOpening();
    fireEvent.click(container.querySelector('.home-play-button')!);
    expect(container.querySelector('#global-sound-toggle')?.classList.contains('sound-toggle-map')).toBe(true);
    expect(screen.getByRole('heading', { name: '지붕과 시계탑' })).toBeTruthy();
    expect(container.querySelectorAll('.map-level-node')).toHaveLength(5);
    expect(screen.getByRole('button', { name: /스테이지 6,/ }).hasAttribute('disabled')).toBe(false);
    expect(container.querySelector('.map-current-card h2')?.textContent).toBe('지붕 위의 고양이 대장');

    fireEvent.click(screen.getByRole('button', { name: '다음 지역' }));
    fireEvent.click(screen.getByRole('button', { name: '홈으로 돌아가기' }));
    fireEvent.click(container.querySelector('.home-play-button')!);
    expect(screen.getByRole('heading', { name: '기계 공장' })).toBeTruthy();
  });

  it('renders the home title and starts a story-led game session', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '우리 둥지를 빼앗겼다!' })).toBeTruthy();
    startFromOpening();
    expect(screen.getByRole('heading', { name: '병아리 대포' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '모험 계속하기' }));
    fireEvent.click(screen.getByRole('button', { name: '출발하기' }));
    expect(screen.getByRole('dialog', { name: '골목대장 고양이' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '도전 시작' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '도전 시작' }));
    expect(screen.getByRole('region', { name: '게임 정보' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '현재 챕터 다시 시작' })).toBeTruthy();
  });

  it('opens the paginated leaderboard and returns home', async () => {
    render(<App />);
    startFromOpening();
    fireEvent.click(screen.getByRole('button', { name: '순위표 열기' }));
    expect(await screen.findByRole('heading', { name: '모험가 순위표' })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: '아직 등록된 기록이 없어요' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '← 돌아가기' }));
    expect(screen.getByRole('heading', { name: '병아리 대포' })).toBeTruthy();
  });
});
