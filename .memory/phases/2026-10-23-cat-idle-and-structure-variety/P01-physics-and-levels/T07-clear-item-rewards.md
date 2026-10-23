# T07 레벨 클리어 아이템 보상

- Status: done
- 스테이지별 클리어 아이템 보상과 최대 2개 보유 규칙을 구현하고, 스테이지 진입 자동 보충을 제거한다.
- 최종 스테이지는 보상 아이템을 직접 선택하게 하고, 알 쿠션 아이템은 알의 점수 감점을 한 번 막는다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- engine.test.ts GameHud.test.tsx GameModal.test.tsx EndingModal.test.tsx` 및 `npm.cmd run build`
- 커밋: `보상: 레벨 클리어 아이템 지급과 최종 보상 선택`
