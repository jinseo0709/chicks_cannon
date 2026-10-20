import { useState, type JSX } from 'react';

export function App(): JSX.Element {
  const [screen, setScreen] = useState<'home' | 'game' | 'leaderboard'>('home');

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="병아리 대포 게임">
        {screen === 'home' && (
          <div className="home-screen">
            <div className="home-art" aria-hidden="true">
              <span className="sun">✦</span>
              <span className="chick">🐥</span>
              <span className="nest">◡</span>
            </div>
            <div className="home-copy">
              <p className="eyebrow">CHICKS CANNON · JOURNEY HOME</p>
              <h1>병아리 대포</h1>
              <p className="tagline">새총을 당겨, 우리 둥지를 되찾자!</p>
              <div className="home-actions">
                <button className="button button-primary" onClick={() => setScreen('game')}>
                  모험 시작
                </button>
                <button className="button button-secondary" onClick={() => setScreen('leaderboard')}>
                  순위표
                </button>
              </div>
              <p className="controls-hint">마우스 또는 손가락으로 병아리를 당긴 뒤 놓으세요</p>
            </div>
          </div>
        )}

        {screen === 'game' && (
          <div className="placeholder-screen">
            <p className="eyebrow">CHAPTER 1 · 골목길 쉼터</p>
            <h2>게임 장면을 준비하고 있어요</h2>
            <p>물리 엔진과 4개 챕터는 다음 작업에서 연결됩니다.</p>
            <button className="button button-secondary" onClick={() => setScreen('home')}>
              홈으로
            </button>
          </div>
        )}

        {screen === 'leaderboard' && (
          <div className="placeholder-screen">
            <p className="eyebrow">COMMUNITY</p>
            <h2>모험가 순위표</h2>
            <p>순위표 연결은 온라인 기록 작업에서 추가됩니다.</p>
            <button className="button button-secondary" onClick={() => setScreen('home')}>
              홈으로
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
