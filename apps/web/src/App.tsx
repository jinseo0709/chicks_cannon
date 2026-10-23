import { useEffect, useMemo, useState, type JSX } from 'react';
import { DialoguePanel } from './components/DialoguePanel';
import { EndingModal } from './components/EndingModal';
import { GameCanvas } from './components/GameCanvas';
import { GameHud } from './components/GameHud';
import { GameModal } from './components/GameModal';
import { PausePanel } from './components/PausePanel';
import { HomeScreen } from './components/HomeScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { OpeningScreen } from './components/OpeningScreen';
import { WorldMapScreen } from './components/WorldMapScreen';
import { LeaderboardClient } from './leaderboard/client';
import { getSafeBrowserStorage } from './leaderboard/identity';
import { useChickCannon } from './game/use-chick-cannon';
import type { GameStage } from './game/types';
import { clearSavedCampaignProgress, createEmptyCampaignProgress, recordStageResult } from './game/progress';

export function App(): JSX.Element {
  const [screen, setScreen] = useState<'opening' | 'home' | 'map' | 'game' | 'leaderboard'>('opening');
  const [leaderboardReturn, setLeaderboardReturn] = useState<'home' | 'map' | 'game'>('home');
  const [progress, setProgress] = useState(() => {
    clearSavedCampaignProgress(getSafeBrowserStorage());
    return createEmptyCampaignProgress();
  });
  const completedStages = progress.completedStages;
  const [leaderboardClient] = useState(() => new LeaderboardClient());
  const controller = useChickCannon();
  const unlockedStage = useMemo<GameStage>(() => {
    const firstIncomplete = ([1, 2, 3, 4, 5, 6] as const).find((stage) => !completedStages.includes(stage));
    return firstIncomplete ?? 6;
  }, [completedStages]);
  const openLeaderboard = (returnTo: 'home' | 'map' | 'game') => {
    setLeaderboardReturn(returnTo);
    setScreen('leaderboard');
  };

  useEffect(() => {
    if (controller.snapshot.state !== 'EVOLUTION' && controller.snapshot.state !== 'ENDING') return;
    setProgress((current) => recordStageResult(current, controller.snapshot.stage, controller.snapshot.stageStars || 1));
  }, [controller.snapshot.stage, controller.snapshot.state]);

  const openStage = (stage: GameStage) => {
    if (stage > unlockedStage) return;
    controller.selectStage(stage, completedStages.includes(stage));
    setScreen('game');
  };

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="병아리 대포 게임">
        {screen === 'opening' && <OpeningScreen onContinue={() => setScreen('home')} />}

        {screen === 'home' && (
          <HomeScreen
            currentStage={unlockedStage}
            onPlay={() => setScreen('map')}
            onOpenLeaderboard={() => openLeaderboard('home')}
          />
        )}

        {screen === 'map' && (
          <WorldMapScreen
            completedStages={completedStages}
            bestStars={progress.bestStars}
            unlockedStage={unlockedStage}
            onSelectStage={openStage}
            onBack={() => setScreen('home')}
            onOpenLeaderboard={() => openLeaderboard('map')}
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
              <DialoguePanel story={controller.snapshot.story} stage={controller.snapshot.stage} onContinue={controller.dismissDialogue} />
            )}
            {controller.snapshot.state === 'PAUSED' && (
              <PausePanel onResume={controller.togglePause} onRestart={controller.retryStage} onExitToMap={() => setScreen('map')} />
            )}
            {controller.snapshot.state === 'ENDING' ? (
              <EndingModal
                score={controller.snapshot.score}
                client={leaderboardClient}
                storage={getSafeBrowserStorage()}
                onPlayAgain={() => controller.restartCampaign()}
                onOpenLeaderboard={() => openLeaderboard('game')}
                onReturnToMap={() => setScreen('map')}
              />
            ) : (
              <GameModal
                snapshot={controller.snapshot}
                onRetry={controller.retryStage}
                onNextStage={() => controller.continueAfterEvolution()}
                onWorldMap={() => setScreen('map')}
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
