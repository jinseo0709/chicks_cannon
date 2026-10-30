import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { DialoguePanel } from './components/DialoguePanel';
import { EndingModal } from './components/EndingModal';
import { GameCanvas } from './components/GameCanvas';
import { GameHud } from './components/GameHud';
import { GameModal } from './components/GameModal';
import { GuideScreen } from './components/GuideScreen';
import { PausePanel } from './components/PausePanel';
import { HomeScreen } from './components/HomeScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { OpeningScreen } from './components/OpeningScreen';
import { WorldMapScreen } from './components/WorldMapScreen';
import { LocalLeaderboardClient } from './leaderboard/local-client';
import { getSafeBrowserStorage } from './leaderboard/identity';
import { useChickCannon } from './game/use-chick-cannon';
import { STAGES } from './game/stages';
import type { GameStage, RegionId } from './game/types';
import { getUnlockedStage, loadCampaignProgress, recordStageResult, saveCampaignProgress } from './game/progress';
import type { CampaignProgress } from './game/progress';

const activeGameStates = new Set(['AIMING', 'FLYING', 'RESOLVING']);

export function App(): JSX.Element {
  const [screen, setScreen] = useState<'opening' | 'guide' | 'home' | 'map' | 'game' | 'leaderboard'>('opening');
  const [leaderboardReturn, setLeaderboardReturn] = useState<'home' | 'map' | 'game'>('home');
  const [progress, setProgress] = useState(() => loadCampaignProgress(getSafeBrowserStorage()));
  const completedStages = progress.completedStages;
  const [leaderboardClient] = useState(() => new LocalLeaderboardClient(getSafeBrowserStorage()));
  const controller = useChickCannon();
  const unlockedStage = useMemo<GameStage>(() => getUnlockedStage(progress), [progress]);
  const showGlobalSoundToggle = screen !== 'game' || !activeGameStates.has(controller.snapshot.state);
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
    if (controller.snapshot.state !== 'WON' && controller.snapshot.state !== 'EVOLUTION' && controller.snapshot.state !== 'ENDING') {
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
        {showGlobalSoundToggle && <button
          id="global-sound-toggle"
          className={`icon-button ui-icon-button ${screen === 'home' ? 'sound-toggle-home' : screen === 'map' ? 'sound-toggle-map' : ''} ${controller.snapshot.muted ? 'ui-icon-muted' : 'ui-icon-sound'}`}
          onClick={controller.toggleMute}
          aria-label={controller.snapshot.muted ? '소리 켜기' : '소리 끄기'}
          aria-pressed={controller.snapshot.muted}
          title={controller.snapshot.muted ? '소리 켜기' : '소리 끄기'}
        />}
        {screen === 'opening' && <OpeningScreen storage={getSafeBrowserStorage()} onContinue={() => setScreen('guide')} />}
        {screen === 'guide' && <GuideScreen onContinue={() => setScreen('home')} />}

        {screen === 'home' && (
          <HomeScreen
            currentStage={unlockedStage}
            onPlay={() => setScreen('map')}
            onOpenGuide={() => setScreen('guide')}
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
