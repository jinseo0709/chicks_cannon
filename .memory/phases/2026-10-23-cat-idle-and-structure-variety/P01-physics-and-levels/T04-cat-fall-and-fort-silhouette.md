# T04 고양이 낙하와 요새 실루엣 개선

- Status: done
- `engine.test.ts`에서 병아리 충돌로 실제 받침 블록이 파괴되고, 고양이가 그 자리에서 떨어지는 흐름을 검증한다.
- `stages.ts`에서 후반 요새에 연결된 계단형·교차 지지대와 다양한 높이를 더해 한눈에 달라지는 실루엣을 만든다.
- `stages.test.ts`에서 다단 높이와 재질 혼합을 검증한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- engine.test.ts stages.test.ts` 및 `npm.cmd run build`
- 커밋: `물리·레벨: 받침 파괴 시 고양이 낙하와 요새 구조 개편`
