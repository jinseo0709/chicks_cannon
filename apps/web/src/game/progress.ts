import type { GameStage } from './types';

export const WORLD_PROGRESS_KEY = 'chicks-cannon-world-progress-v1';

export interface CampaignProgress {
  version: 2;
  completedStages: GameStage[];
  bestStars: Partial<Record<GameStage, 1 | 2 | 3>>;
}

const ALL_STAGES: readonly GameStage[] = [1, 2, 3, 4, 5, 6];
export const createEmptyCampaignProgress = (): CampaignProgress => ({ version: 2, completedStages: [], bestStars: {} });

export function clearSavedCampaignProgress(storage: Storage): void {
  try {
    storage.removeItem(WORLD_PROGRESS_KEY);
  } catch {
    // Progress remains session-only even when browser storage is unavailable.
  }
}

export function recordStageResult(progress: CampaignProgress, stage: GameStage, stars: 1 | 2 | 3): CampaignProgress {
  const previousStars = progress.bestStars[stage] ?? 0;
  if (progress.completedStages.includes(stage) && previousStars >= stars) return progress;
  return {
    version: 2,
    completedStages: ALL_STAGES.filter((candidate) => candidate === stage || progress.completedStages.includes(candidate)),
    bestStars: { ...progress.bestStars, [stage]: Math.max(previousStars, stars) as 1 | 2 | 3 },
  };
}
