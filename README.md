# Chicks Cannon

둥지를 되찾기 위해 병아리를 새총으로 발사하는 캐주얼 물리 퍼즐 게임입니다.

## 주요 기능

- 여섯 단계로 이어지는 월드맵과 챕터 진행
- 성장 단계마다 달라지는 병아리 외형과 능력
- 목재, 돌, 유리, TNT 등 물리 기반 장애물
- 움직이는 새총 고무줄과 발사 궤적 표시
- 타격 점수, 파괴 효과, 캐릭터 눈 깜빡임 연출
- 3D 스타일의 배경, 캐릭터, 홈 화면 디오라마

## 로컬 실행

Node.js 22 이상이 필요합니다.

```bash
npm ci
npm run dev:web
```

브라우저에서 `http://localhost:5173`을 엽니다.

## 검사

```bash
npm test
npm run build
```

## 프로젝트 구조

- `apps/web`: React와 Matter.js 기반 게임 클라이언트
- `apps/api`: 순위표용 Azure Functions API
- `infra`: Azure 배포 템플릿
- `docs`: 로컬 실행과 배포 문서

## 조작법

병아리를 뒤로 끌어당긴 뒤 놓으면 발사됩니다. 장애물과 고양이를 공략해 스테이지를 완료하세요.
