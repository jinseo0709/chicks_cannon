import type { JSX } from 'react';

export interface HomeScreenProps {
  onPlay(): void;
  onOpenLeaderboard(): void;
}

export function HomeScreen({ onPlay, onOpenLeaderboard }: HomeScreenProps): JSX.Element {
  return (
    <section className="home-screen" aria-labelledby="home-title">
      <div className="home-art" aria-hidden="true">
        <span className="sun">✦</span>
        <span className="chick">🐥</span>
        <span className="nest">◡</span>
      </div>
      <div className="home-copy">
        <p className="eyebrow">CHICKS CANNON · JOURNEY HOME</p>
        <h1 id="home-title">병아리 대포</h1>
        <p className="tagline">새총을 당겨, 우리 둥지를 되찾자!</p>
        <div className="home-actions">
          <button className="button button-primary" onClick={onPlay}>모험 시작</button>
          <button className="button button-secondary" onClick={onOpenLeaderboard}>순위표</button>
        </div>
        <p className="controls-hint">새총 주변을 마우스나 손가락으로 당겨 조준하세요</p>
      </div>
    </section>
  );
}
