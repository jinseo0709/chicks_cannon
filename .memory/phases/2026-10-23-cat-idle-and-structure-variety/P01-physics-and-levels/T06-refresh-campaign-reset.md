# T06 새로고침 시 점수·월드맵 기록 초기화

- Status: done
- 월드맵 완료 상태와 최고 별점을 브라우저 저장소에서 불러오거나 기록하지 않고, 앱 세션 메모리에서만 유지한다.
- 이전 버전의 저장 기록은 초기 로드 때 제거한다.
- 검증: `npm.cmd test --workspace @chicks-cannon/web -- progress.test.ts App.test.tsx` 및 `npm.cmd run build`
- 커밋: `진행도: 새로고침 시 점수와 월드맵 별점 초기화`
