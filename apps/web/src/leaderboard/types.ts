export interface LeaderboardRow {
  participantId: string;
  nickname: string;
  bestScore: number;
  achievedAt: string;
  rank: number;
}

export interface LeaderboardPage {
  items: LeaderboardRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ScoreSubmission {
  participantId: string;
  nickname: string;
  bestScore: number;
  achievedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitScoreInput {
  nickname: string;
  score: number;
  campaignCompleted: true;
}

export interface ParticipantIdentity {
  participantId: string;
  nickname: string | null;
}

export class LeaderboardApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'LeaderboardApiError';
  }
}
