# Task: T03 React 순위표와 점수 제출 흐름

## Status: done

## Goal
캠페인 완주 점수를 API에 등록하고 브라우저의 참가자/닉네임을 기억하며, 홈과 엔딩 화면에서 전 참가자 순위를 페이지 단위로 확인할 수 있게 한다.

## Decision Summary
- 계정 가입 없이 첫 기록 제출 때 닉네임을 받는다. 참가자 UUID와 닉네임은 같은 브라우저의 localStorage에 보관한다.
- 한 참가자는 최고 점수 하나만 기록하며, 전체 순위는 캠페인 완료 후의 최종 점수로 조회한다.
- 순위표는 모든 순위를 페이지 단위로 제공하며, 외부 링크/이미지 공유 기능은 포함하지 않는다.

## Implementation

### I01. API client와 브라우저 참가자 identity
- Related Files:
  - `apps/web/src/leaderboard/types.ts` :: API request/response DTO; new
  - `apps/web/src/leaderboard/client.ts` :: `LeaderboardClient` — GET/POST `/api/leaderboard`; new
  - `apps/web/src/leaderboard/identity.ts` :: `getOrCreateParticipant`, `getSavedNickname`, `saveNickname`; new
  - `apps/web/src/leaderboard/identity.test.ts` :: storage parsing/version tests; new
  - `apps/web/src/leaderboard/client.test.ts` :: fetch/status/error tests; new

#### Details
- **Signatures & Types**:
  ```typescript
  export interface LeaderboardRow { participantId: string; nickname: string; bestScore: number; achievedAt: string; rank: number }
  export interface LeaderboardPage { items: LeaderboardRow[]; page: number; pageSize: number; totalCount: number; totalPages: number }
  export class LeaderboardClient {
    constructor(fetcher?: typeof fetch, baseUrl?: string);
    list(page: number, pageSize?: number, signal?: AbortSignal): Promise<LeaderboardPage>;
    submit(input: { participantId: string; nickname: string; score: number; campaignCompleted: true }): Promise<LeaderboardRow>;
  }
  export interface ParticipantIdentity { participantId: string; nickname: string|null }
  export function getOrCreateParticipant(storage: Storage): string;
  export function getSavedNickname(storage: Storage): string|null;
  export function saveNickname(storage: Storage, nickname: string): void;
  ```
- Keys: `chicks-cannon:participant-id:v1` stores UUID from `crypto.randomUUID()`; `chicks-cannon:nickname:v1` stores normalized nickname. Invalid/corrupt ID is replaced with new UUID; storage exceptions (private mode/quota) fall back to a session-only in-memory identity without crashing play. Do not store campaign state or score queue.
- Client validates page request bounds and maps non-2xx JSON errors to typed `LeaderboardApiError { status, code, message }`; network/JSON parse errors are surfaced in UI with retry. POST uses `Content-Type: application/json`, passes `campaignCompleted:true` only from engine `ENDING` state, and never submits intermediate score.
- Nickname modal trims and enforces same 2–16 Unicode code point and allowed characters as API before enabling submit. Stored nickname updates only after successful submit; if the browser had a previous nickname, offer it prefilled. If score is lower than the stored best, API response communicates persisted best and UI says record retained.

### I02. Leaderboard page, end submit, and screen navigation
- Related Files:
  - `apps/web/src/components/LeaderboardScreen.tsx` :: `LeaderboardScreen` — paginated full rankings; new
  - `apps/web/src/components/NicknameDialog.tsx` :: `NicknameDialog` — first-submission form; new
  - `apps/web/src/components/ScoreSubmissionPanel.tsx` :: `ScoreSubmissionPanel` — ending score submission state; new
  - `apps/web/src/App.tsx` :: home/leaderboard/game navigation; modify
  - `apps/web/src/components/EndingModal.tsx` :: final score submit and leaderboard actions; new or extracted from `GameModal.tsx`
  - `apps/web/src/components/LeaderboardScreen.test.tsx` :: pagination/loading/error/accessibility tests; new
  - `apps/web/src/components/ScoreSubmissionPanel.test.tsx` :: completed-only submit/identity tests; new

#### Details
- **Component contracts**:
  ```typescript
  export interface LeaderboardScreenProps { client: LeaderboardClient; onBack(): void; pageSize?: number }
  export interface ScoreSubmissionPanelProps { score: number; completed: boolean; client: LeaderboardClient; storage: Storage }
  export interface NicknameDialogProps { initialNickname: string|null; busy: boolean; error: string|null; onSubmit(nickname: string): void; onCancel(): void }
  ```
- `LeaderboardScreen`: page size 25; GET current page; show all participant rows including repeated nicknames, rank, name, bestScore, localized achieved date; previous/next and current-page/total-pages controls; empty state; loading skeleton; retryable API error. If `totalPages=0`, render empty state and disable pagination. Abort previous fetch on page switch/unmount. Back returns to prior home/end context.
- Home leaderboard button opens board. Ending screen provides “순위 등록” and “전체 순위” actions; first registration opens nickname dialog, subsequent submissions use saved nickname directly. Do not auto-submit until user presses button. Disable duplicate submit while pending; show saved/updated result, API retry, and existing Play Again.
- Display the final score as authoritative UI result from completed engine state; only expose score submit control when `completed===true`. Escape all data through React text nodes; no `dangerouslySetInnerHTML`. No external share button or generated share card.
- Add `aria-live` for submit status and errors, semantic table headers, keyboard-operable paging and modal focus/escape behavior. Make 320px viewport table horizontally readable (responsive card rows or scroll container with accessible label).

### I03. Ranking flow tests
- Related Files:
  - `apps/web/src/components/LeaderboardScreen.test.tsx` :: pagination and error test cases; modify
  - `apps/web/src/components/ScoreSubmissionPanel.test.tsx` :: first/subsequent submit; modify
  - `apps/web/src/App.test.tsx` :: home→leaderboard and ending→leaderboard navigation; modify
- Test scenarios: no request before campaign completion; nickname validation; successful first submit persists UUID/nickname; second run reuses participant and nickname; lower score response retains best; duplicate button clicks issue one POST; GET pagination updates ranks; empty and failed API states recover; same display nickname with different participant UUIDs appear as separate rows; no external share controls.

## Acceptance Criteria
- [ ] Completed campaign can submit final score once per action; partial campaign cannot submit.
- [ ] Browser remembers participant UUID/nickname and handles unavailable localStorage gracefully.
- [ ] Home and ending screens open an all-record paginated leaderboard with retry/empty/loading states.
- [ ] Same nicknames remain separate entries and no external share link/image feature appears.

## Validation
- `npm test --workspace @chicks-cannon/web -- --run src/leaderboard src/components/LeaderboardScreen src/components/ScoreSubmissionPanel src/App` — leaderboard flow tests pass.
- `npm run build --workspace @chicks-cannon/web` — app builds against `/api/leaderboard` contract.

## Commit Message
```text
feat(leaderboard): add nickname submission and full rankings UI

Plan: 2026-10-20-chicks-cannon-react
Phase: P02-online-leaderboard
Task: T03-leaderboard-ui

- Remember anonymous browser identity and nickname
- Add completed-score submission and paginated public standings
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(leaderboard): add nickname submission and full rankings UI

