import { DefaultAzureCredential } from '@azure/identity';
import { CosmosClient, type Container, type SqlQuerySpec } from '@azure/cosmos';
import type { LeaderboardEntry, LeaderboardPage, LeaderboardStore, SubmitScoreRequest } from './types';

interface LeaderboardDocument {
  id: string;
  participantId: string;
  nickname: string;
  bestScore: number;
  achievedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface StoreDependencies {
  containerProvider(): Promise<Container>;
}

let sharedContainerPromise: Promise<Container> | null = null;

function getSharedContainer(): Promise<Container> {
  if (sharedContainerPromise) return sharedContainerPromise;
  const endpoint = process.env.COSMOS_ENDPOINT?.trim();
  const databaseId = process.env.COSMOS_DATABASE_ID?.trim();
  const containerId = process.env.COSMOS_CONTAINER_ID?.trim();
  if (!endpoint || !databaseId || !containerId) {
    throw new Error('LEADERBOARD_STORE=cosmos requires COSMOS_ENDPOINT, COSMOS_DATABASE_ID, and COSMOS_CONTAINER_ID.');
  }
  const client = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
  sharedContainerPromise = Promise.resolve(client.database(databaseId).container(containerId));
  return sharedContainerPromise;
}

function isStatus(error: unknown, statusCode: number): boolean {
  return typeof error === 'object' && error !== null
    && 'code' in error && Number((error as { code?: unknown }).code) === statusCode;
}

function toEntry(document: LeaderboardDocument): LeaderboardEntry {
  return {
    participantId: document.participantId,
    nickname: document.nickname,
    bestScore: Number(document.bestScore),
    achievedAt: new Date(document.achievedAt).toISOString(),
    createdAt: new Date(document.createdAt).toISOString(),
    updatedAt: new Date(document.updatedAt).toISOString(),
  };
}

export class CosmosLeaderboardStore implements LeaderboardStore {
  private readonly containerProvider: () => Promise<Container>;

  constructor(dependencies?: StoreDependencies) {
    this.containerProvider = dependencies?.containerProvider ?? getSharedContainer;
  }

  async submitBest(request: SubmitScoreRequest, now: Date): Promise<LeaderboardEntry> {
    const container = await this.containerProvider();
    const item = container.item(request.participantId, request.participantId);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      let existing: LeaderboardDocument | undefined;
      let etag: string | undefined;
      try {
        const response = await item.read<LeaderboardDocument>();
        existing = response.resource;
        etag = response.etag;
      } catch (error) {
        if (!isStatus(error, 404)) throw error;
      }

      const timestamp = now.toISOString();
      const next: LeaderboardDocument = existing
        ? {
            ...existing,
            nickname: request.nickname,
            bestScore: Math.max(existing.bestScore, request.score),
            achievedAt: request.score > existing.bestScore ? timestamp : existing.achievedAt,
            updatedAt: timestamp,
          }
        : {
            id: request.participantId,
            participantId: request.participantId,
            nickname: request.nickname,
            bestScore: request.score,
            achievedAt: timestamp,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

      try {
        if (!existing) {
          await container.items.create(next);
        } else {
          await item.replace(next, etag ? { accessCondition: { type: 'IfMatch', condition: etag } } : undefined);
        }
        return toEntry(next);
      } catch (error) {
        if ((isStatus(error, 409) && !existing) || (isStatus(error, 412) && existing)) continue;
        throw error;
      }
    }
    throw new Error('Could not save the leaderboard entry after repeated concurrent updates.');
  }

  async list(page: number, pageSize: number): Promise<LeaderboardPage> {
    const container = await this.containerProvider();
    const countSpec: SqlQuerySpec = { query: 'SELECT VALUE COUNT(1) FROM c' };
    const countResult = await container.items.query<number>(countSpec).fetchAll();
    const totalCount = Number(countResult.resources[0] ?? 0);
    const offset = (page - 1) * pageSize;
    const entriesSpec: SqlQuerySpec = {
      query: 'SELECT * FROM c ORDER BY c.bestScore DESC, c.achievedAt ASC, c.participantId ASC OFFSET @offset LIMIT @pageSize',
      parameters: [
        { name: '@offset', value: offset },
        { name: '@pageSize', value: pageSize },
      ],
    };
    const entriesResult = await container.items.query<LeaderboardDocument>(entriesSpec).fetchAll();
    const rankCache = new Map<number, number>();
    const items = await Promise.all(entriesResult.resources.map(async (document) => {
      const score = Number(document.bestScore);
      let higherCount = rankCache.get(score);
      if (higherCount === undefined) {
        const rankSpec: SqlQuerySpec = {
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.bestScore > @score',
          parameters: [{ name: '@score', value: score }],
        };
        const rankResult = await container.items.query<number>(rankSpec).fetchAll();
        higherCount = Number(rankResult.resources[0] ?? 0);
        rankCache.set(score, higherCount);
      }
      return { ...toEntry(document), rank: higherCount + 1 };
    }));
    return { items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
  }
}
