import { normalizeNickname } from './identity';
import type { LeaderboardPage, LeaderboardRepository, LocalSubmitScoreInput, ScoreSubmission } from './types';

const leaderboardKey = 'chicks-cannon:local-leaderboard:v1';

export class LocalLeaderboardClient implements LeaderboardRepository {
  constructor(private readonly storage: Storage, private readonly clock: () => Date = () => new Date()) {}

  async list(page: number, pageSize = 25, signal?: AbortSignal): Promise<LeaderboardPage> {
    this.validatePagination(page, pageSize);
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    const sorted = this.readEntries().sort((left, right) =>
      right.bestScore - left.bestScore
      || left.achievedAt.localeCompare(right.achievedAt)
      || left.participantId.localeCompare(right.participantId),
    );
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize).map((entry) => {
      const rank = sorted.findIndex((candidate) => candidate.bestScore === entry.bestScore) + 1;
      return {
        participantId: entry.participantId,
        nickname: entry.nickname,
        bestScore: entry.bestScore,
        achievedAt: entry.achievedAt,
        rank,
      };
    });
    const totalCount = sorted.length;
    return { items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
  }

  async submit(input: LocalSubmitScoreInput): Promise<ScoreSubmission> {
    if (input.campaignCompleted !== true) throw new Error('캠페인을 완주한 기록만 등록할 수 있습니다.');
    const nickname = normalizeNickname(input.nickname);
    if (!nickname) throw new Error('닉네임은 2~16자의 한글·영문·숫자·공백·_·-로 입력해 주세요.');
    if (!Number.isSafeInteger(input.score) || input.score < 0 || input.score > 50_000) {
      throw new Error('점수 범위가 올바르지 않습니다.');
    }
    if (!input.participantId.trim()) throw new Error('플레이어 정보를 확인할 수 없습니다.');

    const entries = this.readEntries();
    const existing = entries.find((entry) => entry.participantId === input.participantId);
    const now = this.clock().toISOString();
    const entry: ScoreSubmission = existing
      ? {
          ...existing,
          nickname,
          bestScore: Math.max(existing.bestScore, input.score),
          achievedAt: input.score > existing.bestScore ? now : existing.achievedAt,
          updatedAt: now,
        }
      : {
          participantId: input.participantId,
          nickname,
          bestScore: input.score,
          achievedAt: now,
          createdAt: now,
          updatedAt: now,
        };
    const nextEntries = entries.filter((candidate) => candidate.participantId !== input.participantId);
    nextEntries.push(entry);
    this.storage.setItem(leaderboardKey, JSON.stringify(nextEntries));
    return { ...entry };
  }

  private readEntries(): ScoreSubmission[] {
    const raw = this.storage.getItem(leaderboardKey);
    if (!raw) return [];
    try {
      const value: unknown = JSON.parse(raw);
      if (!Array.isArray(value)) return [];
      return value.filter(isScoreSubmission);
    } catch {
      return [];
    }
  }

  private validatePagination(page: number, pageSize: number): void {
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error('순위표 페이지 요청이 올바르지 않습니다.');
    }
  }
}

function isScoreSubmission(value: unknown): value is ScoreSubmission {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ScoreSubmission>;
  return typeof entry.participantId === 'string'
    && typeof entry.nickname === 'string'
    && Number.isSafeInteger(entry.bestScore)
    && typeof entry.achievedAt === 'string'
    && typeof entry.createdAt === 'string'
    && typeof entry.updatedAt === 'string';
}
