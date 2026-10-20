import { DefaultAzureCredential } from '@azure/identity';
import sql from 'mssql';
import type {
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardStore,
  RateLimitResult,
  SubmitScoreRequest,
} from './types';

interface SqlResult<T> {
  recordset: T[];
  recordsets: T[][];
}

interface SqlRequestLike {
  input(name: string, type: unknown, value?: unknown): this;
  query<T = Record<string, unknown>>(statement: string): Promise<SqlResult<T>>;
}

interface SqlPoolLike {
  request(): SqlRequestLike;
}

interface SqlTransactionLike {
  begin(isolationLevel?: number): Promise<void>;
  request(): SqlRequestLike;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

interface SqlStoreDependencies {
  poolProvider(): Promise<SqlPoolLike>;
  transactionFactory(pool: SqlPoolLike): SqlTransactionLike;
}

interface EntryRow {
  participantId: string;
  nickname: string;
  bestScore: number;
  achievedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface AttemptRow {
  attemptedAt: Date | string;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;
let sharedPoolPromise: Promise<SqlPoolLike> | null = null;

function validateSqlSettings(): void {
  if (!process.env.AZURE_SQL_SERVER?.trim() || !process.env.AZURE_SQL_DATABASE?.trim()) {
    throw new Error('LEADERBOARD_STORE=sql requires AZURE_SQL_SERVER and AZURE_SQL_DATABASE.');
  }
}

function getSharedPool(): Promise<SqlPoolLike> {
  if (sharedPoolPromise) return sharedPoolPromise;
  const server = process.env.AZURE_SQL_SERVER?.trim();
  const database = process.env.AZURE_SQL_DATABASE?.trim();
  if (!server || !database) {
    throw new Error('LEADERBOARD_STORE=sql requires AZURE_SQL_SERVER and AZURE_SQL_DATABASE.');
  }
  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.AZURE_CLIENT_ID || undefined,
  });
  const config: sql.config = {
    server,
    database,
    options: { encrypt: true, trustServerCertificate: false },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
    authentication: {
      type: 'token-credential',
      options: { credential },
    },
  };
  const pool = new sql.ConnectionPool(config);
  sharedPoolPromise = pool.connect()
    .then((connected) => connected as unknown as SqlPoolLike)
    .catch((error: unknown) => {
      sharedPoolPromise = null;
      throw new Error(`Unable to connect to configured Azure SQL database: ${safeMessage(error)}`);
    });
  return sharedPoolPromise;
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown connection error';
}

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function mapEntry(row: EntryRow): LeaderboardEntry {
  return {
    participantId: row.participantId.toLowerCase(),
    nickname: row.nickname,
    bestScore: Number(row.bestScore),
    achievedAt: toIso(row.achievedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export class SqlLeaderboardStore implements LeaderboardStore {
  private readonly poolProvider: () => Promise<SqlPoolLike>;
  private readonly transactionFactory: (pool: SqlPoolLike) => SqlTransactionLike;

  constructor(dependencies?: SqlStoreDependencies) {
    if (!dependencies) validateSqlSettings();
    this.poolProvider = dependencies?.poolProvider ?? getSharedPool;
    this.transactionFactory = dependencies?.transactionFactory ?? ((pool) =>
      new sql.Transaction(pool as unknown as sql.ConnectionPool) as unknown as SqlTransactionLike);
  }

  async recordSubmissionAttempt(participantId: string, now: Date): Promise<RateLimitResult> {
    const pool = await this.poolProvider();
    return this.inTransaction(pool, async (transaction) => {
      const request = transaction.request()
        .input('participantId', sql.UniqueIdentifier, participantId)
        .input('now', sql.DateTime2, now);
      await request.query(`
        DELETE FROM dbo.SubmissionAttempt
        WHERE ParticipantId = @participantId
          AND AttemptedAt <= DATEADD(minute, -10, @now);
      `);
      const result = await transaction.request()
        .input('participantId', sql.UniqueIdentifier, participantId)
        .query<AttemptRow>(`
          SELECT AttemptedAt AS attemptedAt
          FROM dbo.SubmissionAttempt WITH (UPDLOCK, HOLDLOCK, INDEX(IX_SubmissionAttempt_Participant_Time))
          WHERE ParticipantId = @participantId
          ORDER BY AttemptedAt ASC;
        `);
      const attempts = result.recordset.map((row) => new Date(row.attemptedAt).getTime());
      if (attempts.length >= 5) {
        const retryAfterSeconds = Math.max(1, Math.ceil((attempts[0] + TEN_MINUTES_MS - now.getTime()) / 1000));
        return { allowed: false, retryAfterSeconds };
      }
      await transaction.request()
        .input('participantId', sql.UniqueIdentifier, participantId)
        .input('now', sql.DateTime2, now)
        .query(`INSERT INTO dbo.SubmissionAttempt (ParticipantId, AttemptedAt) VALUES (@participantId, @now);`);
      return { allowed: true, retryAfterSeconds: 0 };
    });
  }

  async submitBest(request: SubmitScoreRequest, now: Date): Promise<LeaderboardEntry> {
    const pool = await this.poolProvider();
    return this.inTransaction(pool, async (transaction) => {
      const locked = await transaction.request()
        .input('participantId', sql.UniqueIdentifier, request.participantId)
        .query<EntryRow>(`
          SELECT ParticipantId AS participantId, Nickname AS nickname, BestScore AS bestScore,
                 AchievedAt AS achievedAt, CreatedAt AS createdAt, UpdatedAt AS updatedAt
          FROM dbo.LeaderboardEntry WITH (UPDLOCK, HOLDLOCK)
          WHERE ParticipantId = @participantId;
        `);
      if (locked.recordset.length === 0) {
        await transaction.request()
          .input('participantId', sql.UniqueIdentifier, request.participantId)
          .input('nickname', sql.NVarChar(16), request.nickname)
          .input('score', sql.Int, request.score)
          .input('now', sql.DateTime2, now)
          .query(`
            INSERT INTO dbo.LeaderboardEntry
              (ParticipantId, Nickname, BestScore, AchievedAt, CreatedAt, UpdatedAt)
            VALUES (@participantId, @nickname, @score, @now, @now, @now);
          `);
      } else {
        await transaction.request()
          .input('participantId', sql.UniqueIdentifier, request.participantId)
          .input('nickname', sql.NVarChar(16), request.nickname)
          .input('score', sql.Int, request.score)
          .input('now', sql.DateTime2, now)
          .query(`
            UPDATE dbo.LeaderboardEntry
            SET Nickname = @nickname,
                BestScore = CASE WHEN @score > BestScore THEN @score ELSE BestScore END,
                AchievedAt = CASE WHEN @score > BestScore THEN @now ELSE AchievedAt END,
                UpdatedAt = @now
            WHERE ParticipantId = @participantId;
          `);
      }
      const saved = await transaction.request()
        .input('participantId', sql.UniqueIdentifier, request.participantId)
        .query<EntryRow>(`
          SELECT ParticipantId AS participantId, Nickname AS nickname, BestScore AS bestScore,
                 AchievedAt AS achievedAt, CreatedAt AS createdAt, UpdatedAt AS updatedAt
          FROM dbo.LeaderboardEntry WHERE ParticipantId = @participantId;
        `);
      if (!saved.recordset[0]) throw new Error('Azure SQL did not return the saved leaderboard entry.');
      return mapEntry(saved.recordset[0]);
    });
  }

  async list(page: number, pageSize: number): Promise<LeaderboardPage> {
    const pool = await this.poolProvider();
    const offset = (BigInt(page) - 1n) * BigInt(pageSize);
    const result = await pool.request()
      .input('offset', sql.BigInt, offset.toString())
      .input('pageSize', sql.Int, pageSize)
      .query<EntryRow & { rank: number; totalCount?: number }>(`
        SELECT COUNT_BIG(*) AS totalCount FROM dbo.LeaderboardEntry;
        SELECT ParticipantId AS participantId, Nickname AS nickname, BestScore AS bestScore,
               AchievedAt AS achievedAt, CreatedAt AS createdAt, UpdatedAt AS updatedAt,
               RANK() OVER (ORDER BY BestScore DESC) AS rank
        FROM dbo.LeaderboardEntry
        ORDER BY BestScore DESC, AchievedAt ASC, ParticipantId ASC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
      `);
    const totalCount = Number(result.recordsets[0]?.[0]?.totalCount ?? 0);
    const rows = result.recordsets[1] ?? [];
    return {
      items: rows.map((row) => ({ ...mapEntry(row), rank: Number(row.rank) })),
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  private async inTransaction<T>(pool: SqlPoolLike, operation: (transaction: SqlTransactionLike) => Promise<T>): Promise<T> {
    const transaction = this.transactionFactory(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // Preserve the original transaction error; the request layer returns a generic error.
      }
      throw error;
    }
  }
}
