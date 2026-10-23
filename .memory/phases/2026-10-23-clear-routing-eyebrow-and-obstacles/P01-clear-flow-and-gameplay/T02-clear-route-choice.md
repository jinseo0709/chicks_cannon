# T02 클리어 후 이동 선택

- Status: done
- 수정 파일: `apps/web/src/components/GameModal.tsx`, `apps/web/src/App.tsx` 및 관련 테스트
- 목표: 클리어 후 진화 화면에서 다음 스테이지 또는 월드맵을 고른다.
- 구현: 다음 스테이지는 엔진의 기존 진화/진행 함수를 사용하고, 최종 단계의 캠페인 종료 처리는 보존한다.
- 검증: `npm test --workspace @chicks-cannon/web -- GameModal.test.tsx App.test.tsx`
- 커밋: `진행: 클리어 후 다음 스테이지 바로가기 추가`
