# T01 두 갈래 약점 구조와 경로 안내

- Status: done
- 수정: `types.ts` (`AttackRoute`, `StageDefinition.attackRoutes`), `stages.ts` (6개 스테이지 경로·약점 좌표), `DialoguePanel.tsx` (경로 힌트), `renderer.ts` (조준 중 번호 표식), 관련 테스트.
- 각 스테이지는 기존의 낮은 받침과 측면·상층·기믹 구조를 두 개의 명시적 공략 선택지로 안내한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- stages.test.ts DialoguePanel.test.tsx renderer.test.ts` 통과, `npm.cmd run build --workspace @chicks-cannon/web` 통과.
- 커밋: `레벨: 두 갈래 약점 경로와 스테이지 힌트 추가`
