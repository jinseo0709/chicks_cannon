# T03 구조물 난이도 상향

- Status: done
- 수정 파일: `apps/web/src/game/stages.ts`, `apps/web/src/game/stages.test.ts`
- 목표: 진행 단계에 따라 구조물의 층, 지지 연결, 혼합 재질 및 연쇄 상호작용을 늘린다.
- 제약: 스테이지별 기믹 학습 순서와 기존 탄환 수 및 별점·아이템 규칙을 유지한다.
- 검증: `npm test --workspace @chicks-cannon/web -- stages.test.ts` 및 웹 빌드
- 커밋: `레벨: 후반 스테이지 구조물 퍼즐 난이도 강화`
