import type {
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardStore,
  RateLimitResult,
  SubmitScoreRequest,
} from './types';

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;

export class MemoryLeaderboardStore implements LeaderboardStore {
  private readonly entries = new Map<string, LeaderboardEntry>();
  private readonly attempts = new Map<string, number[]>();

  async recordSubmissionAttempt(participantId: string, now: Date): Promise<RateLimitResult> {
    const cutoff = now.getTime() - RATE_WINDOW_MS;
    const recent = (this.attempts.get(participantId) ?? []).filter((timestamp) => timestamp > cutoff);
    if (recent.length >= RATE_LIMIT) {
      this.attempts.set(participantId, recent);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + RATE_WINDOW_MS - now.getTime()) / 1000)),
      };
    }
    recent.push(now.getTime());
    this.attempts.set(participantId, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  }

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
