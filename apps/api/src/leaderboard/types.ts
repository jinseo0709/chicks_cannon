export interface LeaderboardEntry {
  participantId: string;
  nickname: string;
  bestScore: number;
  achievedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitScoreRequest {
  participantId: string;
  nickname: string;
  score: number;
  campaignCompleted: true;
}

export interface RankedLeaderboardEntry extends LeaderboardEntry {
  rank: number;
}

export interface LeaderboardPage {
  items: RankedLeaderboardEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface LeaderboardStore {
  submitBest(request: SubmitScoreRequest, now: Date): Promise<LeaderboardEntry>;
  list(page: number, pageSize: number): Promise<LeaderboardPage>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
