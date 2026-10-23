# T02 선택형 시간 보너스 도전

- Status: done
- 수정: `apps/web/src/game/types.ts`, `stages.ts`, `engine.ts`, `GameHud.tsx`, `GameModal.tsx`, 관련 테스트.
- 데이터: 스테이지별 `timeLimitMs`, `bonusScore`, 배지 이름을 둔다. 제한 시간 내 클리어하면 추가 점수와 배지를 얻고, 시간 초과 후에도 플레이를 계속한다.
- 규칙: 시간은 시작 대화를 닫은 뒤 흐르고 일시정지 중 멈춘다. 별점은 보너스 점수 적용 전의 기본 스테이지 점수로 계산한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- engine.test.ts GameHud.test.tsx GameModal.test.tsx` 및 웹 빌드.
- 커밋: `게임플레이: 선택형 시간 보너스 도전과 클리어 배지 추가`
