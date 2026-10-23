# T01 캐릭터 깜빡임 얼굴 수정

- Status: done
- 수정 파일: `apps/web/src/game/renderer.ts`, `apps/web/src/game/renderer.test.ts`
- 목표: 눈 깜빡임 중 눈썹이 사라지거나 얼굴 위에 어색한 선이 생기는 현상을 제거한다.
- 구현: 제공되는 전용 얼굴 자산만 사용하고, 눈썹을 가리는 임의의 곡선 오버레이는 제거한다.
- 검증: `npm test --workspace @chicks-cannon/web -- renderer.test.ts`
- 커밋: `표현: 캐릭터 깜빡임 눈썹 렌더링 수정`
