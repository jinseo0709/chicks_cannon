import { ApiError, type SubmitScoreRequest } from './types';

const participantIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const nicknamePattern = /^[\p{L}\p{N}_ -]+$/u;

export function parseParticipantId(value: unknown): string {
  if (typeof value !== 'string' || !participantIdPattern.test(value)) {
    throw new ApiError(400, 'INVALID_PARTICIPANT_ID', '참가자 ID는 UUID v4 형식이어야 합니다.');
  }
  return value.toLowerCase();
}

export function parseSubmitScore(input: unknown, participantId: string): SubmitScoreRequest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'INVALID_REQUEST', '요청 본문은 JSON 객체여야 합니다.');
  }
  const value = input as Record<string, unknown>;
  const nickname = typeof value.nickname === 'string' ? value.nickname.trim() : '';
  const nicknameLength = [...nickname].length;
  if (nicknameLength < 2 || nicknameLength > 16 || !nicknamePattern.test(nickname)) {
    throw new ApiError(400, 'INVALID_NICKNAME', '닉네임은 한글·영문·숫자·공백·_·-만 사용해 2~16자로 입력해 주세요.');
  }
  if (!Number.isSafeInteger(value.score) || (value.score as number) < 0 || (value.score as number) > 50_000) {
    throw new ApiError(400, 'INVALID_SCORE', '점수는 0부터 50,000 사이의 정수여야 합니다.');
  }
  if (value.campaignCompleted !== true) {
    throw new ApiError(400, 'CAMPAIGN_INCOMPLETE', '캠페인을 완주한 기록만 제출할 수 있습니다.');
  }
  return {
    participantId: parseParticipantId(participantId),
    nickname,
    score: value.score as number,
    campaignCompleted: true,
  };
}

export function parsePageQuery(query: URLSearchParams): { page: number; pageSize: number } {
  const parse = (key: string, fallback: number): number => {
    const raw = query.get(key);
    if (raw === null) return fallback;
    if (!/^\d+$/.test(raw)) throw new ApiError(400, 'INVALID_PAGINATION', `${key}는 양의 정수여야 합니다.`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new ApiError(400, 'INVALID_PAGINATION', `${key}는 양의 정수여야 합니다.`);
    }
    return value;
  };
  const page = parse('page', 1);
  const pageSize = parse('pageSize', 25);
  if (pageSize > 100) throw new ApiError(400, 'INVALID_PAGINATION', 'pageSize는 100 이하여야 합니다.');
  return { page, pageSize };
}
