# 고양이 대기 안정화와 구조물 구성 다양화

## Phase 01: 물리 안정화 및 구조물 확장

### T01 고양이의 자발적 움직임 방지
- `apps/web/src/game/engine.ts`에서 스테이지 시작 시 고양이를 잠든 상태로 두고 충돌 시 다시 활성화되는지 확인한다.
- `apps/web/src/game/engine.test.ts`에 전 스테이지 대기 위치 고정 및 충돌 후 깨움 검증을 추가한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- engine.test.ts`
- 커밋: `물리: 발사 전 고양이 자발 이동 방지`

### T02 강철·고무 재질 구현
- `types.ts`, `constants.ts`, `engine.ts`, `renderer.ts`, `asset-cache.ts`와 SVG 재질 자산을 확장한다.
- 강철은 고내구·고밀도, 고무는 경량·고탄성으로 동작하며 손상 단계가 시각화되어야 한다.
- 렌더러 및 엔진 재질 테스트를 추가한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- renderer.test.ts engine.test.ts`
- 커밋: `재질: 강철과 고무 구조물 추가`

### T03 계단형·고층 스테이지 구성
- `apps/web/src/game/stages.ts`를 계단형 대형 요새와 보조 구조물로 조정하고 강철·고무를 섞는다.
- 기존 학습 순서, 탄환 수, 아이템, 별점 조건은 보존한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- stages.test.ts` 및 `npm.cmd run build`
- 커밋: `레벨: 계단형 고층 구조물과 재질 조합 확장`

### T04 고양이 낙하와 요새 실루엣 개선
- 잠든 고양이의 수면 상태까지 해제하고, 병아리가 실제 받침 블록을 파괴하면 고양이가 떨어지는 검증을 추가한다.
- 2·4·5단계에 연결된 계단형 보조 요새를 더하고 6단계에는 교차 받침을 추가해 구조 실루엣을 복잡하게 만든다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- engine.test.ts stages.test.ts` 및 `npm.cmd run build`
- 커밋: `물리·레벨: 받침 파괴 시 고양이 낙하와 요새 구조 개편`

### T05 점수 HUD 한국어·아기자기한 표현
- HUD와 클리어 결과의 점수 안내를 한국어로 바꾸고, 따뜻한 파스텔 카드와 장식으로 표현한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- GameHud.test.tsx GameModal.test.tsx` 및 `npm.cmd run build`
- 커밋: `화면: 점수 안내 한국어화와 귀여운 HUD 적용`

## 실행 규칙
- 각 Task 검증 통과 후 한국어 커밋을 만들고 다음 Task로 진행한다.
- 검증 실패를 해결할 수 없으면 그 Task에서 멈추고 결과를 보고한다.
