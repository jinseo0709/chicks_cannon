# T01 고양이의 자발적 움직임 방지

- Status: done
- 수정 파일: `apps/web/src/game/engine.ts`, `apps/web/src/game/engine.test.ts`
- 목표: 발사 전 고양이가 중력과 작은 충돌로 움직여 장애물을 파손하지 않게 한다.
- 동작: 고양이를 스테이지 시작 시 정지시키고, 병아리가 장애물 또는 고양이를 맞히면 동적 물리를 해제해 낙하할 수 있게 한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- engine.test.ts`
- 커밋: `물리: 발사 전 고양이 자발 이동 방지`
