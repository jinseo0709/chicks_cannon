import { describe, expect, it, vi } from 'vitest';
import { SqlLeaderboardStore } from './sql-store';
import type { SubmitScoreRequest } from './types';

const participantId = '550e8400-e29b-41d4-a716-446655440000';
const now = new Date('2026-10-20T12:00:00.000Z');

function setup(queryHandler: (statement: string, parameters: Map<string, unknown>) => Promise<unknown>) {
  const statements: Array<{ statement: string; parameters: Map<string, unknown> }> = [];
  const makeRequest = () => {
    const parameters = new Map<string, unknown>();
    return {
      input(name: string, _type: unknown, value?: unknown) {
        parameters.set(name, value);
        return this;
      },
      async query<T>(statement: string) {
        statements.push({ statement, parameters: new Map(parameters) });
        const result = await queryHandler(statement, parameters);
        return result as T;
      },
    };
  };
  const pool = { request: makeRequest };
  const transaction = {
    begin: vi.fn().mockResolvedValue(undefined),
    request: makeRequest,
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  };
  const store = new SqlLeaderboardStore({
    poolProvider: async () => pool,
    transactionFactory: () => transaction,
  });
  return { store, statements, transaction };
}

const request = (score: number, nickname = '새싹'): SubmitScoreRequest => ({
  participantId, nickname, score, campaignCompleted: true,
});

describe('SqlLeaderboardStore', () => {
  it('binds participant values and performs a serializable insert/update without downgrading', async () => {
    let row: Record<string, unknown> | null = null;
    const setupResult = setup(async (statement, params) => {
      if (statement.includes('WITH (UPDLOCK, HOLDLOCK)')) return { recordset: row ? [row] : [] };
      if (statement.includes('INSERT INTO dbo.LeaderboardEntry')) {
        row = {
          participantId: params.get('participantId'),
          nickname: params.get('nickname'),
          bestScore: params.get('score'),
          achievedAt: params.get('now'),
          createdAt: params.get('now'),
          updatedAt: params.get('now'),
        };
        return { recordset: [] };
      }
      if (statement.includes('UPDATE dbo.LeaderboardEntry')) {
        row = {
          ...row,
          nickname: params.get('nickname'),
          bestScore: Math.max(Number(row?.bestScore), Number(params.get('score'))),
          achievedAt: Number(params.get('score')) > Number(row?.bestScore) ? params.get('now') : row?.achievedAt,
          updatedAt: params.get('now'),
        };
        return { recordset: [] };
      }
      if (statement.includes('FROM dbo.LeaderboardEntry WHERE ParticipantId')) return { recordset: row ? [row] : [] };
      return { recordset: [] };
    });

    const first = await setupResult.store.submitBest(request(100), now);
    const second = await setupResult.store.submitBest(request(60, '다른새'), new Date(now.getTime() + 1000));
    expect(first.bestScore).toBe(100);
    expect(second.bestScore).toBe(100);
    expect(second.nickname).toBe('다른새');
    expect(second.achievedAt).toBe(now.toISOString());
    expect(setupResult.transaction.begin).toHaveBeenCalledWith(4);
    const insert = setupResult.statements.find(({ statement }) => statement.includes('INSERT INTO dbo.LeaderboardEntry'))!;
    expect(insert.statement).toContain('@nickname');
    expect(insert.statement).not.toContain('새싹');
    expect(insert.parameters.get('participantId')).toBe(participantId);
    expect(setupResult.transaction.rollback).not.toHaveBeenCalled();
  });

  it('returns a database-backed limit decision and commits a denied attempt without inserting', async () => {
    const fiveAttempts = Array.from({ length: 5 }, (_, index) => ({
      attemptedAt: new Date(now.getTime() - index * 1000),
    }));
    const setupResult = setup(async (statement) => {
      if (statement.includes('SELECT AttemptedAt')) return { recordset: fiveAttempts };
      return { recordset: [] };
    });
    const result = await setupResult.store.recordSubmissionAttempt(participantId, now);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(600);
    expect(setupResult.statements.some(({ statement }) => statement.includes('INSERT INTO dbo.SubmissionAttempt'))).toBe(false);
    expect(setupResult.transaction.commit).toHaveBeenCalledOnce();
  });

  it('maps tied ranks and stable page data from bound OFFSET/FETCH query results', async () => {
    const setupResult = setup(async () => ({
      recordset: [],
      recordsets: [
        [{ totalCount: 3 }],
        [
          {
            participantId, nickname: '새싹', bestScore: 100, rank: 1,
            achievedAt: now, createdAt: now, updatedAt: now,
          },
          {
            participantId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8', nickname: '두리', bestScore: 100, rank: 1,
            achievedAt: now, createdAt: now, updatedAt: now,
          },
        ],
      ],
    }));
    const page = await setupResult.store.list(2, 2);
    expect(page).toMatchObject({ page: 2, pageSize: 2, totalCount: 3, totalPages: 2 });
    expect(page.items.map((entry) => entry.rank)).toEqual([1, 1]);
    expect(page.items[0].achievedAt).toBe(now.toISOString());
    const query = setupResult.statements[0];
    expect(query.statement).toContain('OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY');
    expect(query.parameters.get('offset')).toBe('2');
    expect(query.parameters.get('pageSize')).toBe(2);
  });

  it('rolls back a transaction when a query fails', async () => {
    const setupResult = setup(async () => { throw new Error('private database detail'); });
    await expect(setupResult.store.recordSubmissionAttempt(participantId, now)).rejects.toThrow('private database detail');
    expect(setupResult.transaction.rollback).toHaveBeenCalledOnce();
    expect(setupResult.transaction.commit).not.toHaveBeenCalled();
  });
});
