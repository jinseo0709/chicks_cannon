import { describe, expect, it } from 'vitest';
import { type Container, type SqlQuerySpec } from '@azure/cosmos';
import { CosmosLeaderboardStore } from './cosmos-store';
import type { SubmitScoreRequest } from './types';

const now = new Date('2026-10-20T12:00:00.000Z');

function makeCosmosContainer() {
  const documents = new Map<string, Record<string, unknown>>();
  const etags = new Map<string, string>();
  let nextEtag = 0;
  const notFound = () => Object.assign(new Error('not found'), { code: 404 });
  const conflict = () => Object.assign(new Error('conflict'), { code: 409 });
  const preconditionFailed = () => Object.assign(new Error('etag mismatch'), { code: 412 });
  const container = {
    item(id: string) {
      return {
        async read() {
          const resource = documents.get(id);
          if (!resource) throw notFound();
          return { resource: { ...resource }, etag: etags.get(id) };
        },
        async replace(body: Record<string, unknown>, options?: { accessCondition?: { condition: string } }) {
          if (options?.accessCondition && options.accessCondition.condition !== etags.get(id)) throw preconditionFailed();
          documents.set(id, { ...body });
          etags.set(id, `etag-${++nextEtag}`);
        },
      };
    },
    items: {
      async create(body: Record<string, unknown>) {
        const id = String(body.id);
        if (documents.has(id)) throw conflict();
        documents.set(id, { ...body });
        etags.set(id, `etag-${++nextEtag}`);
      },
      query<T>(spec: SqlQuerySpec) {
        return {
          async fetchAll() {
            const rows = [...documents.values()];
            if (spec.query.includes('COUNT(1)')) {
              const scoreParameter = spec.parameters?.find((parameter) => parameter.name === '@score');
              const count = scoreParameter
                ? rows.filter((row) => Number(row.bestScore) > Number(scoreParameter.value)).length
                : rows.length;
              return { resources: [count] as T[] };
            }
            rows.sort((left, right) => Number(right.bestScore) - Number(left.bestScore)
              || String(left.achievedAt).localeCompare(String(right.achievedAt))
              || String(left.participantId).localeCompare(String(right.participantId)));
            const offset = Number(spec.parameters?.find((parameter) => parameter.name === '@offset')?.value ?? 0);
            const limit = Number(spec.parameters?.find((parameter) => parameter.name === '@pageSize')?.value ?? rows.length);
            return { resources: rows.slice(offset, offset + limit) as T[] };
          },
        };
      },
    },
  };
  return { container: container as unknown as Container, documents };
}

const submission = (participantId: string, score: number, nickname = '새싹'): SubmitScoreRequest => ({
  participantId, nickname, score, campaignCompleted: true,
});

describe('CosmosLeaderboardStore', () => {
  it('stores all leaderboard records in the one provided container and never downgrades a score', async () => {
    const { container, documents } = makeCosmosContainer();
    const store = new CosmosLeaderboardStore({ containerProvider: async () => container });
    const first = await store.submitBest(submission('participant-1', 500), now);
    const lower = await store.submitBest(submission('participant-1', 300, '새이름'), new Date(now.getTime() + 1000));

    expect(first.bestScore).toBe(500);
    expect(lower).toMatchObject({ bestScore: 500, nickname: '새이름', achievedAt: now.toISOString() });
    expect(documents.size).toBe(1);
  });

  it('returns paged records with competition ranks for tied scores', async () => {
    const { container } = makeCosmosContainer();
    const store = new CosmosLeaderboardStore({ containerProvider: async () => container });
    await store.submitBest(submission('first', 900), now);
    await store.submitBest(submission('second', 900), new Date(now.getTime() + 1000));
    await store.submitBest(submission('third', 400), now);

    const page = await store.list(1, 3);
    expect(page).toMatchObject({ totalCount: 3, totalPages: 1 });
    expect(page.items.map((entry) => entry.rank)).toEqual([1, 1, 3]);
    expect(page.items.map((entry) => entry.bestScore)).toEqual([900, 900, 400]);
  });
});
