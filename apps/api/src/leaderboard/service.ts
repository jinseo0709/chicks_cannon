import { parsePageQuery, parseParticipantId, parseSubmitScore } from './validation';
import { ApiError, type LeaderboardStore } from './types';

export class LeaderboardService {
  constructor(
    private readonly store: LeaderboardStore,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async submit(input: unknown, participantId: string) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ApiError(400, 'INVALID_REQUEST', '요청 본문은 JSON 객체여야 합니다.');
    }
    const authenticatedParticipantId = parseParticipantId(participantId);
    const attemptedAt = this.clock();
    const limit = await this.store.recordSubmissionAttempt(authenticatedParticipantId, attemptedAt);
    if (!limit.allowed) {
      throw new ApiError(429, 'RATE_LIMITED', '제출 횟수가 많습니다. 잠시 후 다시 시도해 주세요.', limit.retryAfterSeconds);
    }
    const request = parseSubmitScore(input, authenticatedParticipantId);
    return this.store.submitBest(request, this.clock());
  }

  async list(query: URLSearchParams) {
    const { page, pageSize } = parsePageQuery(query);
    return this.store.list(page, pageSize);
  }
}
