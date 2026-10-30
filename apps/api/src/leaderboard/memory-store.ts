import type {
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardStore,
  SubmitScoreRequest,
} from './types';

export class MemoryLeaderboardStore implements LeaderboardStore {
  private readonly entries = new Map<string, LeaderboardEntry>();

  async submitBest(request: SubmitScoreRequest, now: Date): Promise<LeaderboardEntry> {
    const timestamp = now.toISOString();
    const existing = this.entries.get(request.participantId);
    const entry: LeaderboardEntry = existing
      ? {
          ...existing,
          nickname: request.nickname,
          bestScore: Math.max(existing.bestScore, request.score),
          achievedAt: request.score > existing.bestScore ? timestamp : existing.achievedAt,
          updatedAt: timestamp,
        }
      : {
          participantId: request.participantId,
          nickname: request.nickname,
          bestScore: request.score,
          achievedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
    this.entries.set(request.participantId, entry);
    return { ...entry };
  }

  async list(page: number, pageSize: number): Promise<LeaderboardPage> {
    const sorted = [...this.entries.values()].sort((left, right) =>
      right.bestScore - left.bestScore ||
      left.achievedAt.localeCompare(right.achievedAt) ||
      left.participantId.localeCompare(right.participantId),
    );
    const totalCount = sorted.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize).map((entry, index) => {
      const globalIndex = start + index;
      const rank = globalIndex > 0 && sorted[globalIndex - 1].bestScore === entry.bestScore
        ? (sorted.findIndex((candidate) => candidate.bestScore === entry.bestScore) + 1)
        : globalIndex + 1;
      return { ...entry, rank };
    });
    return { items, page, pageSize, totalCount, totalPages };
  }
}
