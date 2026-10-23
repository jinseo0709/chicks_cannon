# 스테이지 클리어 이동, 캐릭터 눈 깜빡임, 구조물 난이도 계획

## Phase 01: 클리어 흐름과 게임 표현 개선

### T01 캐릭터 깜빡임 얼굴 수정
- `apps/web/src/game/renderer.ts`의 `drawSprite` 깜빡임 처리를 점검하고 얼굴 자산을 해치지 않도록 변경한다.
- 필요한 경우 자산 캐시의 눈 감김 변형 지원을 조사한다. 현재 제공되지 않는 변형에 임의의 곡선 오버레이를 그리지 않는다.
- `apps/web/src/game/renderer.test.ts`에서 깜빡임 시각 전환을 검증한다.
- 검증: `npm test --workspace @chicks-cannon/web -- renderer.test.ts`
- 커밋: `표현: 캐릭터 깜빡임 눈썹 렌더링 수정`

### T02 클리어 화면에서 다음 단계 또는 월드맵 선택
- `apps/web/src/components/GameModal.tsx`에 다음 단계와 월드맵 버튼을 둔다.
- `apps/web/src/App.tsx`에서 다음 단계는 `continueAfterEvolution()`을 호출해 기존 엔진 전환과 점수 저장을 보존한다. 최종 스테이지는 기존 엔딩으로 이동한다.
- 컴포넌트 및 앱 흐름 테스트를 추가한다.
- 검증: `npm test --workspace @chicks-cannon/web -- GameModal.test.tsx App.test.tsx`
- 커밋: `진행: 클리어 후 다음 스테이지 바로가기 추가`

### T03 구조물 난이도 상향
- `apps/web/src/game/stages.ts`의 구조물 배치를 재구성하여 단계가 진행될수록 더 많은 지지 연결, 층, 혼합 재질과 보조 구조물을 배치한다.
- 기존 6단계 기믹 소개 순서, 탄환 수, 별점·아이템 규칙은 유지한다.
- `apps/web/src/game/stages.test.ts`에 복합 구조물의 점진적 증가 및 기존 탄환 수 유지 검증을 추가한다.
- 검증: `npm test --workspace @chicks-cannon/web -- stages.test.ts` 및 웹 빌드
- 커밋: `레벨: 후반 스테이지 구조물 퍼즐 난이도 강화`

## 실행 규칙
- 각 Task 구현 후 지정 검증을 실행한다. 실패하면 해당 Task에서 멈춘다.
- Task 검증 통과 후 한국어 커밋을 만들고, 계획 상태 및 `.memory/current.md`를 다음 Task로 갱신한다.
