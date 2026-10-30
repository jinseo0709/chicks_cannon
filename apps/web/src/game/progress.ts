import { STAGE_ORDER } from './constants';
import type { GameStage } from './types';

export const WORLD_PROGRESS_KEY = 'chicks-cannon-world-progress-v1';

export interface CampaignProgress {
  version: 4;
  completedStages: GameStage[];
  bestStars: Partial<Record<GameStage, 1 | 2 | 3>>;
  challengeBadges: GameStage[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const createEmptyCampaignProgress = (): CampaignProgress => ({
  version: 4,
  completedStages: [],
  bestStars: {},
  challengeBadges: [],
});

function validStage(value: unknown, maxStage = 20): value is GameStage {
  return Number.isInteger(value) && typeof value === 'number' && value >= 1 && value <= maxStage;
}

function normalizeProgress(input: unknown, sourceVersion: 3 | 4): CampaignProgress {
  if (!isRecord(input)) return createEmptyCampaignProgress();
  const value = input;
  const maxStage = sourceVersion === 3 ? 6 : 20;
  const validCompleted = Array.isArray(value.completedStages)
    ? value.completedStages.filter((stage): stage is GameStage => validStage(stage, maxStage))
    : [];
  const completedStages = STAGE_ORDER.filter((stage) => validCompleted.includes(stage));
  const bestStars: CampaignProgress['bestStars'] = {};
  if (isRecord(value.bestStars)) {
    for (const [key, stars] of Object.entries(value.bestStars)) {
      const stage = Number(key);
      if (validStage(stage, maxStage) && completedStages.includes(stage) && (stars === 1 || stars === 2 || stars === 3)) {
        bestStars[stage] = stars;
      }
    }
  }
  const validBadges = Array.isArray(value.challengeBadges)
    ? value.challengeBadges.filter((stage): stage is GameStage => validStage(stage, maxStage))
    : [];
  const challengeBadges = STAGE_ORDER.filter((stage) => completedStages.includes(stage) && validBadges.includes(stage));
  return { version: 4, completedStages, bestStars, challengeBadges };
}

export function loadCampaignProgress(storage: Pick<Storage, 'getItem'>): CampaignProgress {
  try {
    const serialized = storage.getItem(WORLD_PROGRESS_KEY);
    if (!serialized) return createEmptyCampaignProgress();
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed) || (parsed.version !== 3 && parsed.version !== 4)) return createEmptyCampaignProgress();
    if (!Array.isArray(parsed.completedStages) || !isRecord(parsed.bestStars) || !Array.isArray(parsed.challengeBadges)) {
      return createEmptyCampaignProgress();
    }
    return normalizeProgress(parsed, parsed.version);
  } catch {
    return createEmptyCampaignProgress();
  }
}

export function saveCampaignProgress(storage: Pick<Storage, 'setItem'>, progress: CampaignProgress): void {
  try {
    storage.setItem(WORLD_PROGRESS_KEY, JSON.stringify(normalizeProgress(progress, 4)));
  } catch {
    // Keep the in-memory campaign usable when browser storage is unavailable.
  }
}

export function clearSavedCampaignProgress(storage: Pick<Storage, 'removeItem'>): void {
  try {
    storage.removeItem(WORLD_PROGRESS_KEY);
  } catch {
    // Progress remains session-only even when browser storage is unavailable.
  }
}

export function getUnlockedStage(progress: CampaignProgress): GameStage {
  return STAGE_ORDER.find((stage) => !progress.completedStages.includes(stage)) ?? STAGE_ORDER[STAGE_ORDER.length - 1];
}

export function recordStageResult(progress: CampaignProgress, stage: GameStage, stars: 1 | 2 | 3, challengeWon = false): CampaignProgress {
  const previousStars = progress.bestStars[stage] ?? 0;
  const completedStages = STAGE_ORDER.filter((candidate) => candidate === stage || progress.completedStages.includes(candidate));
  const challengeBadges = challengeWon && !progress.challengeBadges.includes(stage)
    ? STAGE_ORDER.filter((candidate) => candidate === stage || progress.challengeBadges.includes(candidate))
    : progress.challengeBadges;
  if (progress.completedStages.includes(stage) && previousStars >= stars && challengeBadges === progress.challengeBadges) return progress;
  return {
    version: 4,
    completedStages,
    bestStars: { ...progress.bestStars, [stage]: Math.max(previousStars, stars) as 1 | 2 | 3 },
    challengeBadges,
  };
}
