import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
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
import { STAGES } from './game/stages';
import type { GameStage, RegionId } from './game/types';
import { getUnlockedStage, loadCampaignProgress, recordStageResult, saveCampaignProgress } from './game/progress';
import type { CampaignProgress } from './game/progress';

export function App(): JSX.Element {
  const [screen, setScreen] = useState<'opening' | 'home' | 'map' | 'game' | 'leaderboard'>('opening');
  const [leaderboardReturn, setLeaderboardReturn] = useState<'home' | 'map' | 'game'>('home');
  const [progress, setProgress] = useState(() => loadCampaignProgress(getSafeBrowserStorage()));
  const completedStages = progress.completedStages;
  const [leaderboardClient] = useState(() => new LeaderboardClient());
  const controller = useChickCannon();
  const unlockedStage = useMemo<GameStage>(() => getUnlockedStage(progress), [progress]);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>(() => STAGES[getUnlockedStage(progress)].region);
  const persistedProgressRef = useRef<CampaignProgress | null>(null);
  const recordedResultRef = useRef<string | null>(null);

  useEffect(() => {
    if (persistedProgressRef.current === progress) return;
    persistedProgressRef.current = progress;
    saveCampaignProgress(getSafeBrowserStorage(), progress);
  }, [progress]);
  useEffect(() => {
    setSelectedRegion(STAGES[unlockedStage].region);
  }, [unlockedStage]);
  const openLeaderboard = (returnTo: 'home' | 'map' | 'game') => {
    setLeaderboardReturn(returnTo);
    setScreen('leaderboard');
  };

  useEffect(() => {
    if (controller.snapshot.state !== 'EVOLUTION' && controller.snapshot.state !== 'ENDING') {
      recordedResultRef.current = null;
      return;
    }
    const challengeWon = controller.snapshot.bonusChallengeStatus === 'success';
    const stars = controller.snapshot.stageStars || 1;
    const resultKey = `${controller.snapshot.stage}:${stars}:${challengeWon}`;
    if (recordedResultRef.current === resultKey) return;
    recordedResultRef.current = resultKey;
    setProgress((current) => recordStageResult(current, controller.snapshot.stage, stars, challengeWon));
  }, [controller.snapshot.stage, controller.snapshot.state, controller.snapshot.stageStars, controller.snapshot.bonusChallengeStatus]);

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
            challengeBadges={progress.challengeBadges}
            unlockedStage={unlockedStage}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            onSelectStage={openStage}
            onBack={() => setScreen('home')}
            onOpenLeaderboard={() => openLeaderboard('map')}
          />
        )}

        {screen === 'game' && (
          <div className="play-screen">
            <GameCanvas controller={controller} />
            {controller.snapshot.state !== 'ENDING' && !(controller.snapshot.state === 'WON' && STAGES[controller.snapshot.stage].bossRole === 'final') && (
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
                items={controller.snapshot.items}
                finalRewardClaimed={controller.snapshot.finalRewardClaimed}
                client={leaderboardClient}
                storage={getSafeBrowserStorage()}
                onClaimReward={controller.claimFinalReward}
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
