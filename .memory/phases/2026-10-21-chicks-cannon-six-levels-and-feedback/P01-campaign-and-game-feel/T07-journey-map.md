# Task: T07 순차 여정 지도와 성장·전환 안내

## Status: pending

## Goal
현재·완료·잠긴 여섯 목적지를 한 데이터로 표시하고, 같은 병아리가 이어지는 1→2·3→4 전환을 진화라고 오표기하지 않는다. 지도는 진행 표시이며 임의 레벨 이동을 제공하지 않는다.

## Decision Summary
- 지도는 Home의여정미리보기,레벨시작대화,클리어전환,엔딩에서사용한다. 진행상태는현재캠페인snapshot에서계산하며잠금해제저장소를새로만들지않는다.
- STAGE_ORDER/STAGES/CHICK_FORMS가 유일한 레벨 순서·이름·아이콘 원본이다. 기존 최종점수 제출 API 계약은 유지한다.

## Implementation

### I01. 여정 노드 모델과 표시 컴포넌트
- Related Files:
  - `apps/web/src/components/JourneyMap.tsx` :: `JourneyMap`, `getJourneyNodes` — 지도; new
  - `apps/web/src/components/JourneyMap.test.tsx` :: 진행표시와접근성; new
  - `apps/web/src/styles.css` :: `.journey-map`, node/media styles — 지도외형; modify
  - `apps/web/src/game/types.ts`, `constants.ts`, `stages.ts` — read-only

#### Details
- **Signatures & Types**:
  ```ts
  export type JourneyStatus = 'completed' | 'current' | 'locked';
  export interface JourneyNode { stage: GameStage; title: string; theme: SceneTheme; avatar: string; status: JourneyStatus; }
  export interface JourneyMapProps { currentStage: GameStage; completedThrough: number; compact?: boolean; }
  export function getJourneyNodes(currentStage: GameStage, completedThrough: number): readonly JourneyNode[];
  export function JourneyMap(props: JourneyMapProps): JSX.Element;
  ```
- completedThrough는0..6정수clamp(비유한0). node.stage<=completedThrough이면completed,그외currentStage와일치하면current,나머지locked. 6장엔딩(completedThrough6)은모두completed고aria-current없음. current가completed보다앞일경우completed우선. 입력상태를로컬스토리지에저장하거나stage버튼으로엔진을호출하지않는다.
- `<ol className="journey-map" aria-label="둥지로 가는 여정">`의6개`li`에`data-stage`, `data-theme`, `data-status`,current인경우에만`aria-current="step"`. node는비대화형이며tabindex/button/onClick없음. 레벨번호·짧은title·체크/잠금아이콘과텍스트로색이외상태를알린다. accessible text는`{stage}단계 {title}, 완료|현재|잠김`. compact에서도이름을접근성에서삭제하지않는다.
- 큰화면6열연결선/둥근노드,현재노드는골드테두리,완료는민트체크,잠김은밝은톤잠금;배경카툰팔레트를재사용한다. 560px이하는3열×2행으로줄여여백/텍스트를확보한다(지도는HUD바가아니므로2행허용). compact모드에선제목을짧게줄이고aria원문유지한다. 작은높이에서는map·story내용을포함한modal-card가세로스크롤가능하고primary버튼은잘리지않아야한다.
- 테스트는각stage1..6/완료0..6상태,정확한6노드,순서/이름원본,aria-current개수,선택기능없음,소형뷰label보존을검증한다. CSS실제폭은T08에서측정한다.

### I02. Home·대화·클리어·엔딩 연결
- Related Files:
  - `apps/web/src/components/HomeScreen.tsx` :: `HomeScreen` — 미리보기지도; modify
  - `apps/web/src/components/DialoguePanel.tsx` :: `DialoguePanelProps`, `DialoguePanel` — 단계시작지도/주의; modify
  - `apps/web/src/components/GameModal.tsx` :: `GameModal` — 진화/목적지구분; modify
  - `apps/web/src/components/EndingModal.tsx` :: `EndingModal` — 전체완료지도; modify
  - `apps/web/src/App.tsx` :: `DialoguePanel` 연결 — stage전달; modify
  - `apps/web/src/styles.css` :: home/story/modal responsive — 영역높이; modify

#### Details
- **Signatures & Types**: DialoguePanelProps에필수`stage:GameStage`추가,기존story/onContinue보존. HomeScreen/EndingModal의기존외부props는그대로둔다.
- Home은지도currentStage1/completedThrough0/compact로6목적지미리보기. 모험시작은기존startCampaign으로1장부터,지도click은없음. 홈제목/시작/순위표가작은화면에서도보이게homecopy와map에전용배치를준다. 게임canvas를홈에서만들지않는다.
- DIALOGUE는currentStage=snapshot.stage,completedThrough=stage-1. App이stage를넘긴다. panel의eyebrow는`LEVEL {n} · {STAGES[n].title}`. 레벨4/6은`아기 달걀을 지켜 주세요. 깨지면 이번 도전은 실패해요.`주의텍스트,3/4/5는각핵심기믹짧은안내를1줄로제공한다. 문구는STAGES기반스테이지별상수map또는StageDefinition의추가`hint:string`을한곳에만둔다. 새필드를넣으면여섯항목과fixture까지함께추가한다.
- EVOLUTION상태의currentlevel은아직클리어한level이다. next=STAGE_ORDER의다음값,지도currentStage=next,completedThrough=snapshot.stage. `.formId`가다를때만`NEW EVOLUTION / 새로운 모습으로 진화!`와다음form아바타/스킬을표시한다. 동일form이면`NEXT STOP / 다음 목적지로!`,nextStage.title과다음기믹안내를표시한다. 두경우모두`다음 챕터로`버튼으로기존continueAfterEvolution만호출한다. next가없으면이모달을열지않는다.
- WON토스트는stage6이면`둥지를 되찾았어요!`그외`요새 돌파 성공! 다음 목적지가 열려요 💛`. 지도클릭은없고바로엔딩을건너뛰지않는다. LOST는기존인질/탄환패배구분과retry동작유지. EndingModal안에currentStage6/completedThrough6의compact지도추가,ScoreSubmissionPanel은기존completedtrue로최종엔딩에서만렌더링한다.
- 실행중게임에상시지도를띄워topbar/dock을다시겹치게하지않는다. T03레이어overlay100/pause110을유지한다. 지도자체가새dialog를만들어기존aria-modal중첩을만들지않는다.

### I03. 진행 문구·랭킹 진입 회귀
- Related Files:
  - `apps/web/src/components/GameModal.test.tsx` :: 같은/다른form전환; modify
  - `apps/web/src/components/DialoguePanel.test.tsx` :: stageprop/인질안내; modify
  - `apps/web/src/components/EndingModal.test.tsx` :: 최종지도와제출유지; modify
  - `apps/web/src/App.test.tsx` :: 진입/지도순서/제출게이트; modify

#### Details
- GameModal테스트의기존stage3evolvedForm4는이제같은breeze이므로`다음목적지`를기대하고stage2→3을별도fixture로진화테스트한다. 단계4클리어에서EndingModal/점수제출이없고6장ENDING만제출컴포넌트가열리는App목업케이스를추가한다. GameModal본체에서다음레벨을직접load하지않는다.
- App기존홈제목/스토리speaker/순위표테스트를보존하고DialoguePanelstage를넘긴다. 상태가다른지도여러개를동시에조회하는테스트는container/within으로범위를한정하고afterEachcleanup한다.

## Acceptance Criteria
- [ ] 지도는6개목적지의현재·완료·잠김을알리고레벨선택버튼이없다.
- [ ] 1→2/3→4는새진화라고표기하지않고다른형태전환은진화로표시한다.
- [ ] 대화/모달에서지도와행동버튼이작은화면에도보인다.
- [ ] 최종점수는6단계엔딩에서만제출할수있다.

## Validation
- `npm.cmd run test --workspace @chicks-cannon/web -- src/components/JourneyMap.test.tsx src/components/DialoguePanel.test.tsx src/components/GameModal.test.tsx src/components/EndingModal.test.tsx src/App.test.tsx`
- `npm.cmd run build --workspace @chicks-cannon/web`
- `git diff --check`

## Commit Message
```text
feat(ui): show the six-stage journey and accurate transitions

Plan: 2026-10-21-chicks-cannon-six-levels-and-feedback
Phase: P01-campaign-and-game-feel
Task: T07-journey-map

- Display completed, current and locked destinations without level skipping
- Distinguish evolution from same-form travel and gate final submission
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
