import type { JSX, PointerEvent } from 'react';
import { STAGES } from '../game/stages';
import type { GameStage } from '../game/types';

export interface HomeScreenProps {
  currentStage: GameStage;
  onPlay(): void;
  onOpenLeaderboard(): void;
}

export function HomeScreen({ currentStage, onPlay, onOpenLeaderboard }: HomeScreenProps): JSX.Element {
  const stage = STAGES[currentStage];
  const moveScene = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty('--home-far-x', `${x * 10}px`);
    event.currentTarget.style.setProperty('--home-far-y', `${y * 6}px`);
    event.currentTarget.style.setProperty('--home-near-x', `${x * -18}px`);
    event.currentTarget.style.setProperty('--home-near-y', `${y * -10}px`);
  };
  const resetScene = (event: PointerEvent<HTMLElement>) => {
    for (const property of ['--home-far-x', '--home-far-y', '--home-near-x', '--home-near-y']) {
      event.currentTarget.style.setProperty(property, '0px');
    }
  };

  return (
    <section className="home-screen" aria-labelledby="home-title" onPointerMove={moveScene} onPointerLeave={resetScene}>
      <div className="home-atmosphere" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>

      <button className="home-rank-button" onClick={onOpenLeaderboard} aria-label="순위표 열기">
        <span aria-hidden="true">♛</span><b>순위표</b>
      </button>

      <header className="home-brand">
        <p>CHICKS CANNON</p>
        <h1 id="home-title">병아리 대포</h1>
        <span>새총을 당겨, 우리 둥지를 되찾자!</span>
      </header>

      <div className="home-diorama" aria-hidden="true">
        <span className="home-character-shadow home-chick-shadow" />
        <span className="home-character-shadow home-nest-shadow" />
        <span className="home-character-shadow home-cat-shadow" />
        <div className="home-hero-chick">
          <img src="/assets/home/hero-chick.png" alt="" />
          <img className="home-hero-chick-blink" src="/assets/home/hero-chick-blink.png" alt="" />
        </div>
        <img className="home-hero-nest" src="/assets/props/nest.png" alt="" />
        <img className="home-peek-cat" src="/assets/home/peek-cat.png" alt="" />
        <span className="home-story-line">둥지를 노리는 수상한 기척…</span>
      </div>

      <div className="home-launch-panel">
        <button className="button button-primary home-play-button" onClick={onPlay}>모험 계속하기</button>
        <p><strong>CHAPTER {currentStage}</strong><span>{stage.title}</span></p>
      </div>
    </section>
  );
}
