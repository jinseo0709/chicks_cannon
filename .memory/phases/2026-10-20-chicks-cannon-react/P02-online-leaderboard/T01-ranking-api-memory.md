# Task: T01 순위 API 계약 및 메모리 저장소

## Status: pending

## Goal
익명 브라우저 참가자가 캠페인 완주 점수를 제출하고 전체 점수표를 페이지별로 읽을 수 있는 Azure Functions HTTP API와 개발용 메모리 저장소를 구현한다.

## Decision Summary
- API는 Azure Functions Node.js v4 TypeScript 모델을 사용한다. 로컬 기본 저장소는 process-memory이며 API 재시작 시 초기화된다.
- 전체 순위 조회, 최초 닉네임 등록, 참가자별 최고 점수 upsert를 제공한다. 계정/외부 공유 링크는 없다.
- 외부 공개 입력이므로 닉네임은 텍스트로만 출력하고 길이 제한을 적용한다. 기본 검증은 완주 요청, 점수 범위, 참가자별 rate limit이며 완전한 치트 방지는 보장하지 않는다.

## Implementation

### I01. DTO, 검증 및 저장소 인터페이스
- Related Files:
  - `apps/api/src/leaderboard/types.ts` :: `LeaderboardEntry`, `SubmitScoreRequest`, `LeaderboardPage`, repository contracts; new
  - `apps/api/src/leaderboard/validation.ts` :: `parseSubmitScore`, `parsePageQuery`; new
  - `apps/api/src/leaderboard/validation.test.ts` :: DTO boundary tests; new
  - `apps/api/src/leaderboard/memory-store.ts` :: `MemoryLeaderboardStore`; new
  - `apps/api/src/leaderboard/memory-store.test.ts` :: ordering/upsert tests; new

#### Details
- **Signatures & Types**:
  ```typescript
  export interface LeaderboardEntry { participantId: string; nickname: string; bestScore: number; achievedAt: string; createdAt: string; updatedAt: string }
  export interface SubmitScoreRequest { participantId: string; nickname: string; score: number; campaignCompleted: true }
  export interface LeaderboardPage { items: Array<LeaderboardEntry & { rank: number }>; page: number; pageSize: number; totalCount: number; totalPages: number }
  export interface LeaderboardStore {
    recordSubmissionAttempt(participantId: string, now: Date): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
    submitBest(request: SubmitScoreRequest, now: Date): Promise<LeaderboardEntry>;
    list(page: number, pageSize: number): Promise<LeaderboardPage>;
  }
  export class MemoryLeaderboardStore implements LeaderboardStore { /* implement contract */ }
  ```
- `participantId`: canonical UUID v4; nickname: trim whitespace, 2–16 Unicode code points, allow Korean/Latin letters, digits, spaces, `_` and `-` only; reject control chars/markup; do not require globally unique nickname. `score`: safe integer 0–50,000 inclusive. `campaignCompleted` must equal `true`.
- Query `page` is integer≥1, default1; `pageSize` default25 and clamp/reject above100 (choose reject with 400). API returns deterministic ordering `bestScore DESC, achievedAt ASC, participantId ASC`; rank is competition rank (equal scores share rank; next rank skips tied places). Page count is `ceil(totalCount/pageSize)`; zero records returns `totalPages:0` and empty items.
- Upsert key is participantId. First submit inserts. Higher score replaces nickname and bestScore and sets achievedAt/updatedAt to now. Lower/equal score preserves previous best score and achievedAt; nickname may update after valid submission and `updatedAt` changes. Use UTC ISO 8601 timestamps.
- Rate limit: at most 5 POST attempts per valid participantId in rolling 10 minutes, counting requests with invalid nickname/score as well as valid scores. `recordSubmissionAttempt` stores timestamp attempts and prunes expired timestamps. Return 429 plus `Retry-After` seconds when over limit. Malformed JSON or invalid participant UUID returns 400 before rate tracking because no trusted participant key exists. Input validation errors are 400; GET query errors 400. No raw exception or SQL details in response.

### I02. HTTP Functions and application services
- Related Files:
  - `apps/api/src/leaderboard/service.ts` :: `LeaderboardService` — validation/rate/upsert orchestration; new
  - `apps/api/src/functions/leaderboard.ts` :: `GET /api/leaderboard`, `POST /api/leaderboard` registration; new
  - `apps/api/src/index.ts` :: function imports and startup selection; modify
  - `apps/api/src/leaderboard/service.test.ts` :: submit/list/rate tests; new
  - `apps/api/src/functions/leaderboard.test.ts` :: HTTP status/response tests; new

#### Details
- **Signatures & Types**:
  ```typescript
  export class LeaderboardService {
    constructor(store: LeaderboardStore, clock?: () => Date);
    submit(input: unknown): Promise<LeaderboardEntry>;
    list(query: URLSearchParams): Promise<LeaderboardPage>;
  }
  export function createLeaderboardHandlers(service: LeaderboardService): {
    get(request: HttpRequest): Promise<HttpResponseInit>;
    post(request: HttpRequest): Promise<HttpResponseInit>;
  };
  ```
- `GET /api/leaderboard?page=1&pageSize=25` → `200 {items,page,pageSize,totalCount,totalPages}`.
- `POST /api/leaderboard` JSON `{participantId,nickname,score,campaignCompleted:true}` → `200 {entry}`; invalid input `400 {error:{code,message}}`; rate limit `429 {error:{code:'RATE_LIMITED',message}}` with `Retry-After` header. GET/POST use `application/json`; only GET and POST methods are registered.
- `submit` parses JSON, validates UUID first, invokes `store.recordSubmissionAttempt`; if denied returns 429 with `Retry-After`; then validates nickname, score and completion marker and calls `submitBest`. Function registration uses `app.http` with authLevel `anonymous`, exact route `leaderboard`, methods `['GET']` and `['POST']` as separate registrations or a shared handler, preserving `/api` host prefix.
- `apps/api/src/index.ts` instantiates `MemoryLeaderboardStore` unless environment `LEADERBOARD_STORE=sql` is explicitly selected; SQL selection is implemented by P02-T02. Do not silently fallback to memory if SQL configuration is invalid in production.
- Tests inject fixed clock and deterministic store; assert validation errors, tie rank, stable pagination, first insert, higher update, lower score no downgrade, limiter boundary, correct status/headers, and no 500 response leaks.

## Acceptance Criteria
- [ ] API validates all required fields and returns the documented status/body shape.
- [ ] Per-participant record stores one best score; ordering, tie rank, pagination and 429 behavior are deterministic.
- [ ] Local process-memory data disappears after process restart and is documented as development-only.
- [ ] Function API exposes `/api/leaderboard` compatible with Static Web Apps `/api` proxy.

## Validation
- `npm test --workspace @chicks-cannon/api -- --run` — service, store and HTTP handler tests pass.
- `npm run build --workspace @chicks-cannon/api` — Functions TypeScript compiles.

## Commit Message
```text
feat(api): add anonymous leaderboard endpoints

Plan: 2026-10-20-chicks-cannon-react
Phase: P02-online-leaderboard
Task: T01-ranking-api-memory

- Validate completed-campaign score submissions and rate limit participants
- Add deterministic paginated rankings backed by local memory
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
