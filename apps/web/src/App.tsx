import { useState, type JSX } from 'react';
import { DialoguePanel } from './components/DialoguePanel';
import { GameCanvas } from './components/GameCanvas';
import { GameHud } from './components/GameHud';
import { GameModal } from './components/GameModal';
import { HomeScreen } from './components/HomeScreen';
import { useChickCannon } from './game/use-chick-cannon';

export function App(): JSX.Element {
  const [screen, setScreen] = useState<'home' | 'game' | 'leaderboard'>('home');
  const controller = useChickCannon();
  const openLeaderboard = () => setScreen('leaderboard');

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="병아리 대포 게임">
        {screen === 'home' && (
          <HomeScreen
            onPlay={() => {
              controller.startCampaign();
              setScreen('game');
            }}
            onOpenLeaderboard={openLeaderboard}
          />
        )}

        {screen === 'game' && (
          <div className="play-screen">
            <GameCanvas controller={controller} />
            <GameHud
              snapshot={controller.snapshot}
              onRestart={controller.retryStage}
              onMute={controller.toggleMute}
              onUseItem={controller.useItem}
            />
            {controller.snapshot.state === 'DIALOGUE' && (
              <DialoguePanel story={controller.snapshot.story} onContinue={controller.dismissDialogue} />
            )}
            <GameModal
              snapshot={controller.snapshot}
              onRetry={controller.retryStage}
              onContinue={controller.continueAfterEvolution}
              onPlayAgain={() => {
                controller.restartCampaign();
                setScreen('game');
              }}
              onOpenLeaderboard={openLeaderboard}
            />
          </div>
        )}

        {screen === 'leaderboard' && (
          <div className="placeholder-screen">
            <p className="eyebrow">COMMUNITY</p>
            <h2>모험가 순위표</h2>
            <p>온라인 기록 연결은 다음 작업에서 추가됩니다.</p>
            <button className="button button-secondary" onClick={() => setScreen('home')}>홈으로</button>
          </div>
        )}
      </section>
    </main>
  );
}
