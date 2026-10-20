import { useState, type JSX } from 'react';
import { DialoguePanel } from './components/DialoguePanel';
import { EndingModal } from './components/EndingModal';
import { GameCanvas } from './components/GameCanvas';
import { GameHud } from './components/GameHud';
import { GameModal } from './components/GameModal';
import { PausePanel } from './components/PausePanel';
import { HomeScreen } from './components/HomeScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { LeaderboardClient } from './leaderboard/client';
import { getSafeBrowserStorage } from './leaderboard/identity';
import { useChickCannon } from './game/use-chick-cannon';

export function App(): JSX.Element {
  const [screen, setScreen] = useState<'home' | 'game' | 'leaderboard'>('home');
  const [leaderboardReturn, setLeaderboardReturn] = useState<'home' | 'game'>('home');
  const [leaderboardClient] = useState(() => new LeaderboardClient());
  const controller = useChickCannon();
  const openLeaderboard = (returnTo: 'home' | 'game') => {
    setLeaderboardReturn(returnTo);
    setScreen('leaderboard');
  };

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="병아리 대포 게임">
        {screen === 'home' && (
          <HomeScreen
            onPlay={() => {
              controller.startCampaign();
              setScreen('game');
            }}
            onOpenLeaderboard={() => openLeaderboard('home')}
          />
        )}

        {screen === 'game' && (
          <div className="play-screen">
            <GameCanvas controller={controller} />
            {controller.snapshot.state !== 'ENDING' && (
              <GameHud
                snapshot={controller.snapshot}
                onRestart={controller.retryStage}
                onMute={controller.toggleMute}
                onUseItem={controller.useItem}
                onTogglePause={controller.togglePause}
              />
            )}
            {controller.snapshot.state === 'DIALOGUE' && (
              <DialoguePanel story={controller.snapshot.story} onContinue={controller.dismissDialogue} />
            )}
            {controller.snapshot.state === 'PAUSED' && (
              <PausePanel onResume={controller.togglePause} onRestart={controller.retryStage} />
            )}
            {controller.snapshot.state === 'ENDING' ? (
              <EndingModal
                score={controller.snapshot.score}
                client={leaderboardClient}
                storage={getSafeBrowserStorage()}
                onPlayAgain={() => controller.restartCampaign()}
                onOpenLeaderboard={() => openLeaderboard('game')}
              />
            ) : (
              <GameModal
                snapshot={controller.snapshot}
                onRetry={controller.retryStage}
                onContinue={controller.continueAfterEvolution}
              />
            )}
          </div>
        )}

        {screen === 'leaderboard' && (
          <LeaderboardScreen client={leaderboardClient} onBack={() => setScreen(leaderboardReturn)} />
        )}
      </section>
    </main>
  );
}
