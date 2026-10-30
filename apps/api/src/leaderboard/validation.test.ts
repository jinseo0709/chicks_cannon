import { describe, expect, it } from 'vitest';
import { parsePageQuery, parseParticipantId, parseSubmitScore } from './validation';
import { ApiError } from './types';

const participantId = '550e8400-e29b-41d4-a716-446655440000';
const valid = { nickname: '유진서 9', score: 50000, campaignCompleted: true };

describe('leaderboard request validation', () => {
  it('accepts completed campaign data and uses the authenticated identity', () => {
    const result = parseSubmitScore({ ...valid, participantId: 'caller-controlled-id', nickname: ' 유진서 9 ' }, participantId);
    expect(result).toEqual({ ...valid, participantId, nickname: '유진서 9' });
  });

  it.each([
    [{ ...valid, nickname: 'x' }, 'INVALID_NICKNAME'],
    [{ ...valid, nickname: '<b>cat</b>' }, 'INVALID_NICKNAME'],
    [{ ...valid, score: 50_001 }, 'INVALID_SCORE'],
    [{ ...valid, score: 1.5 }, 'INVALID_SCORE'],
    [{ ...valid, campaignCompleted: false }, 'CAMPAIGN_INCOMPLETE'],
  ])('rejects invalid submission fields', (input, code) => {
    try {
      parseSubmitScore(input, participantId);
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe(code);
    }
  });

  it('requires a valid opaque UUID for the authenticated participant', () => {
    expect(() => parseParticipantId('not-an-id')).toThrowError(ApiError);
  });

  it('uses stable defaults and rejects malformed or excessive pagination', () => {
    expect(parsePageQuery(new URLSearchParams())).toEqual({ page: 1, pageSize: 25 });
    expect(parsePageQuery(new URLSearchParams('page=3&pageSize=10'))).toEqual({ page: 3, pageSize: 10 });
    expect(() => parsePageQuery(new URLSearchParams('pageSize=101'))).toThrowError(ApiError);
    expect(() => parsePageQuery(new URLSearchParams('page=0'))).toThrowError(ApiError);
  });
});
