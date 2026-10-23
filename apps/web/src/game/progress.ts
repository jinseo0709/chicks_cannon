import type { GameStage } from './types';

export const WORLD_PROGRESS_KEY = 'chicks-cannon-world-progress-v1';

export interface CampaignProgress {
  version: 3;
  completedStages: GameStage[];
  bestStars: Partial<Record<GameStage, 1 | 2 | 3>>;
  challengeBadges: GameStage[];
}

const ALL_STAGES: readonly GameStage[] = [1, 2, 3, 4, 5, 6];
export const createEmptyCampaignProgress = (): CampaignProgress => ({ version: 3, completedStages: [], bestStars: {}, challengeBadges: [] });

export function clearSavedCampaignProgress(storage: Storage): void {
  try {
    storage.removeItem(WORLD_PROGRESS_KEY);
  } catch {
    // Progress remains session-only even when browser storage is unavailable.
  }
}

export function recordStageResult(progress: CampaignProgress, stage: GameStage, stars: 1 | 2 | 3, challengeWon = false): CampaignProgress {
  const previousStars = progress.bestStars[stage] ?? 0;
  const challengeBadges = challengeWon && !progress.challengeBadges.includes(stage) ? [...progress.challengeBadges, stage] : progress.challengeBadges;
  if (progress.completedStages.includes(stage) && previousStars >= stars && challengeBadges === progress.challengeBadges) return progress;
  return {
    version: 3,
    completedStages: ALL_STAGES.filter((candidate) => candidate === stage || progress.completedStages.includes(candidate)),
    bestStars: { ...progress.bestStars, [stage]: Math.max(previousStars, stars) as 1 | 2 | 3 },
    challengeBadges,
  };
}
