# T01 고양이의 자발적 움직임 방지

- Status: done
- 수정 파일: `apps/web/src/game/engine.ts`, `apps/web/src/game/engine.test.ts`
- 목표: 발사 전 고양이가 중력과 작은 충돌로 움직여 장애물을 파손하지 않게 한다.
- 동작: 고양이를 시작 상태에서 잠들게 하고, 게임 내 충돌 시 정상적으로 깨어나게 한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- engine.test.ts`
- 커밋: `물리: 발사 전 고양이 자발 이동 방지`
