# Plan: 병아리 대포 React 전환 및 그래픽 개선

## Goal
첨부된 단일 HTML 게임을 React + TypeScript + Vite 앱으로 이전한다. Matter.js 기반의 4개 챕터 캠페인과 조작·진화·아이템·점수 규칙을 유지하고, 동화책풍 SVG 그래픽과 반응형 UI를 제공한다. 캠페인 완주 점수를 공용 순위표에 등록하고 전체 기록을 페이지 단위로 볼 수 있게 한다. 로컬 API는 메모리 저장소를 쓰며, Azure 배포 구성을 통해 Azure SQL로 전환한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | React 게임 기반, Matter.js 캠페인 로직, SVG/Canvas 렌더링 및 게임 UI 구현 | [P01](../phases/2026-10-20-chicks-cannon-react/P01-react-game/phase.md) |
| P02 | `done` | 순위 API, 메모리/Azure SQL 저장소, 닉네임과 순위표 UI 연결 | [P02](../phases/2026-10-20-chicks-cannon-react/P02-online-leaderboard/phase.md) |
| P03 | `done` | Azure Static Web Apps·Functions·SQL 배포 설정 및 운영 안내 준비 | [P03](../phases/2026-10-20-chicks-cannon-react/P03-azure-deployment/phase.md) |

## Confirmed Decisions
- React, TypeScript, Vite; 데스크톱 마우스와 모바일 터치; Matter.js 0.19.0 기반 물리.
- 4개 챕터와 엔딩, 병아리 진화, 보스·장애물·구출, 기존 스킬/아이템/점수 규칙을 유지한다.
- SVG 캐릭터·배경 원화를 Canvas 장면에 사용하고, Matter.js 물체 및 효과는 Canvas에서 그린다.
- 닉네임 없이 계정 가입을 요구하지 않는다. 참가자 UUID와 닉네임을 브라우저에 기억하고, 참가자별 최고 완주 점수 하나를 저장한다.
- 순위는 캠페인 최종 점수로 정렬하며 모든 기록을 페이지 단위로 조회한다. 순위표는 홈과 완주 화면에서 열고 외부 공유 링크/이미지는 제공하지 않는다.
- 개발 API의 메모리 저장은 API 재시작 시 초기화된다. Azure 배포 설정에서는 Azure SQL Database를 사용한다.
- Azure Static Web Apps(Standard) + 별도 Azure Functions API + Azure SQL Database 구성으로 배포 준비를 하되, 실제 Azure 리소스 생성/배포는 수행하지 않는다.

## Scope Notes
- Azure Static Web Apps의 별도 Functions 백엔드 연결은 Standard 플랜이 요구되며 `/api` 경로로 연결한다. 배포 문서에서 이 전제와 API 앱 별도 배포를 명시한다. [Microsoft Learn: Bring your own Functions](https://learn.microsoft.com/azure/static-web-apps/functions-bring-your-own)
- Azure Functions는 Node.js v4 프로그래밍 모델을 사용한다. [Microsoft Learn: Node.js developer reference](https://learn.microsoft.com/azure/azure-functions/functions-reference-node)
- 기본 점수 검증은 완주 이후 제출, 정수 점수 범위, 참가자별 요청 제한으로 한정한다. 익명 클라이언트 점수는 완전한 부정행위 방지를 보장하지 않는다.
