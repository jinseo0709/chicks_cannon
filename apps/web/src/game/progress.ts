import type { GameStage } from './types';

export const WORLD_PROGRESS_KEY = 'chicks-cannon-world-progress-v1';

export interface CampaignProgress {
  version: 2;
  completedStages: GameStage[];
  bestStars: Partial<Record<GameStage, 1 | 2 | 3>>;
}

const ALL_STAGES: readonly GameStage[] = [1, 2, 3, 4, 5, 6];
const emptyProgress = (): CampaignProgress => ({ version: 2, completedStages: [], bestStars: {} });

function normalizeStages(value: unknown): GameStage[] {
  if (!Array.isArray(value)) return [];
  return ALL_STAGES.filter((stage) => value.includes(stage));
}

function normalizeStars(value: unknown): CampaignProgress['bestStars'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: CampaignProgress['bestStars'] = {};
  for (const stage of ALL_STAGES) {
    const stars = source[String(stage)];
    if (typeof stars === 'number' && Number.isInteger(stars) && stars >= 1 && stars <= 3) result[stage] = stars as 1 | 2 | 3;
  }
  return result;
}

export function decodeCampaignProgress(serialized: string | null): CampaignProgress {
  if (!serialized) return emptyProgress();
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (Array.isArray(parsed)) return { version: 2, completedStages: normalizeStages(parsed), bestStars: {} };
    if (!parsed || typeof parsed !== 'object') return emptyProgress();
    const record = parsed as Record<string, unknown>;
    return {
      version: 2,
      completedStages: normalizeStages(record.completedStages),
      bestStars: normalizeStars(record.bestStars),
    };
  } catch {
    return emptyProgress();
  }
}

export function loadCampaignProgress(storage: Storage): CampaignProgress {
  try {
    const serialized = storage.getItem(WORLD_PROGRESS_KEY);
    const progress = decodeCampaignProgress(serialized);
    if (serialized) {
      const parsed: unknown = JSON.parse(serialized);
      if (Array.isArray(parsed)) saveCampaignProgress(progress, storage);
    }
    return progress;
  } catch {
    return emptyProgress();
  }
}

export function saveCampaignProgress(progress: CampaignProgress, storage: Storage): void {
  try {
    storage.setItem(WORLD_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Keep the current session's progress in React state if storage is unavailable.
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
