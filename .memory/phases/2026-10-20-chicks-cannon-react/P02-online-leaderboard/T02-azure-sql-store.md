# Task: T02 Azure SQL 순위 저장소

## Status: done

## Goal
P02-T01에서 정의한 `LeaderboardStore` 계약을 Azure SQL Database로 구현하고, 배포 API가 프로세스 메모리에 의존하지 않도록 영구 순위 저장·조회 경로를 제공한다.

## Decision Summary
- 개발 기본값은 메모리 저장소로 유지한다. 배포에서 `LEADERBOARD_STORE=sql`이면 Azure SQL 저장소를 선택하며, 설정 오류 시 메모리로 조용히 되돌아가지 않는다.
- Azure Functions에서 Azure SQL로 연결할 때 비밀번호를 코드/설정 파일에 넣지 않고 Microsoft Entra 인증과 managed identity를 사용한다.
- Data contract: `LeaderboardEntry` UUID 참가자 키, nickname, 최고점, 달성/생성/갱신 시각; 참가자별 최고 기록 1개.

## Implementation

### I01. SQL 스키마와 저장소 adapter
- Related Files:
  - `apps/api/package.json` :: `mssql`, `@types/mssql`, `@azure/identity` dependency — SQL 연결; modify
  - `apps/api/sql/001-leaderboard.sql` :: `LeaderboardEntry`, `SubmissionAttempt` 테이블/index 생성; new
  - `apps/api/src/leaderboard/sql-store.ts` :: `SqlLeaderboardStore` — `LeaderboardStore` 구현; new
  - `apps/api/src/leaderboard/sql-store.test.ts` :: query mapping/concurrency contract tests; new
  - `apps/api/src/index.ts` :: `LEADERBOARD_STORE` factory selection; modify
  - `apps/api/.env.example` :: local SQL connection options; new

#### Details
- **Database schema**:
  ```sql
  CREATE TABLE dbo.LeaderboardEntry (
    ParticipantId uniqueidentifier NOT NULL PRIMARY KEY,
    Nickname nvarchar(16) NOT NULL,
    BestScore int NOT NULL CHECK (BestScore BETWEEN 0 AND 50000),
    AchievedAt datetime2(3) NOT NULL,
    CreatedAt datetime2(3) NOT NULL,
    UpdatedAt datetime2(3) NOT NULL
  );
  CREATE INDEX IX_LeaderboardEntry_Ranking ON dbo.LeaderboardEntry(BestScore DESC, AchievedAt ASC, ParticipantId ASC);
  CREATE TABLE dbo.SubmissionAttempt (
    Id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ParticipantId uniqueidentifier NOT NULL,
    AttemptedAt datetime2(3) NOT NULL
  );
  CREATE INDEX IX_SubmissionAttempt_Participant_Time ON dbo.SubmissionAttempt(ParticipantId, AttemptedAt DESC);
  ```
- Store class implements exactly the T01 interface. Use a process-wide pooled `mssql.ConnectionPool`; never create a pool per request. Connection server/database come from `AZURE_SQL_SERVER` and `AZURE_SQL_DATABASE`; encrypt true, trustServerCertificate false. Authentication uses `azure-active-directory-default`/`DefaultAzureCredential` supported by the selected Tedious/mssql versions, so local Azure CLI login and Azure Function managed identity work without a password. Pin mutually compatible package versions in lockfile.
- `recordSubmissionAttempt`: insert current timestamp in `SubmissionAttempt` inside a transaction, delete same-participant attempts older than 10 minutes, count remaining attempts; allow counts 1–5 and reject count>5 with `retryAfterSeconds = ceil(oldestAttempt+10m-now)`. This runs immediately after UUID parsing so malformed score/nickname submissions are counted. It is database-backed so separate Azure Function instances share the limit.
- `submitBest`: called only after DTO validation and rate-limit approval; transaction with `SERIALIZABLE` or explicit `UPDLOCK,HOLDLOCK` for participant row. Insert if absent; higher score updates nickname, score, achievedAt, updatedAt; equal/lower score preserves best score and achievedAt, but valid nickname can update. Unique key race must retry/select existing row once or return a controlled 503; never lose a better concurrent score.
- `list`: one SQL query for totalCount plus requested `OFFSET/FETCH` rows ordered by score desc, achievedAt asc, ParticipantId asc. Add `RANK() OVER (ORDER BY BestScore DESC)` as `rank`; tie rows share rank and next rank skips places. Return UTC ISO timestamps and same `LeaderboardPage` envelope.
- `.env.example` documents only variable names and example non-secret values; do not add real credentials. Local configured SQL is optional; default local memory remains zero-configuration.
- `index.ts` selects memory unless exact value `sql`; sql mode validates config at startup and surfaces a clear startup error if missing. Existing handler shape and DTOs remain unchanged.

### I02. SQL store verification
- Related Files:
  - `apps/api/src/leaderboard/sql-store.test.ts` :: transaction/query unit tests; modify
  - `apps/api/sql/001-leaderboard.test.md` :: manual schema smoke checklist — local/deployed SQL verification steps; new
- Mock the `mssql` pool to assert bound parameters (never interpolate user values), transaction rollback on over-limit, tie rank and stable paging mapping, and monotonic score update behavior. Manual SQL smoke checklist: apply migration twice must fail clearly or be documented one-time; run one insert, a higher update, lower submit, and tied list query; confirm one row per participant and consistent ranking.

## Acceptance Criteria
- [ ] SQL schema enforces unique participant IDs and valid score range, and indexes ranking/order and rate-limit queries.
- [ ] SQL adapter implements the same contract and best-score semantics as memory adapter under concurrent upserts.
- [ ] Managed identity/passwordless auth is used; no secret is committed and SQL mode never silently falls back.
- [ ] Local default remains in-memory and its reset-on-restart behavior is unchanged.

## Validation
- `npm test --workspace @chicks-cannon/api -- --run` — memory/API tests remain green and SQL adapter tests pass.
- `npm run build --workspace @chicks-cannon/api` — SQL store and Azure Identity imports compile.
- SQL smoke checklist in `apps/api/sql/001-leaderboard.test.md` — execute only when an Azure SQL instance is available; no cloud resource is created by this Task.

## Commit Message
```text
feat(api): add Azure SQL leaderboard repository

Plan: 2026-10-20-chicks-cannon-react
Phase: P02-online-leaderboard
Task: T02-azure-sql-store

- Add leaderboard and submission-limit SQL schema
- Persist best scores through a managed identity connection
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(api): add Azure SQL leaderboard repository

