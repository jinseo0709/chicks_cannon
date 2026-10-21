# Task: T08 실제 샷 해법·브라우저 레이아웃·최종 통합 검증

## Status: pending

## Goal
여섯레벨을아이템없이실제발사/스킬로통과하는고정해법을확보하고,실제Chromium의320px·390px·데스크톱에서UI/그래픽/일시정지/입력을검증해증거를남긴다. JSDOM호출검사만으로시각품질을완료처리하지않는다.

## Decision Summary
- 난이도수정은요구기믹/보호대상/6단계진행을유지하는범위에서좌표·파워·HP·탄환수의작은조정만허용한다. 엔진state를WON으로직접설정한테스트는공략가능성증거가아니다.
- 현재브라우저자동화의존성/설정이없다. 이Task에서Playwright개발의존성/Chromium을설치하고lockfile에해결버전을기록한다. 설치·실제실행이불가능하면미검증으로보고하고완료시키지않는다.

## Implementation

### I01. 실제 물리의 고정 캠페인 해법
- Related Files:
  - `apps/web/src/game/campaign-playthrough.test.ts` :: 6단계실제샷재생/탐색모드; new
  - `apps/web/src/game/test-fixtures/campaign-solutions.ts` :: `CAMPAIGN_SOLUTIONS` — 검증된샷데이터; new
  - `apps/web/src/game/stages.ts` :: `STAGES` — 검증에필요한최소밸런스수정만; modify-if-needed
  - `apps/web/src/game/constants.ts` :: 형태파워 — 필요시최소조정; modify-if-needed

#### Details
- **Signatures & Types**:
  ```ts
  interface SolutionShot { aim: Point; skillAfterMs: number | null; }
  interface StageSolution { stage: GameStage; warmupMs: number; shots: readonly SolutionShot[]; }
  export const CAMPAIGN_SOLUTIONS: readonly StageSolution[];
  ```
- 정규회귀는newChickCannonEngine→startCampaign→dismissDialogue→현재단계warmup(기본2000ms)→setAim/releaseAim→skillAfterMs에한번activateSkill→AIMING/WON/LOST까지16.667msstep이다. 한샷최대12초(720steps),정산이끝나지않으면실패로기록한다. stage당shot수<=STAGES[stage].ammo. useItem을호출하지않고모든재고가1인지확인한다. stage4/6인질은모든step에서alive. WON후700ms를진행해1~5EVOLUTION/6ENDING을확인하고continueAfterEvolution으로이어간다. 실제충돌결과로처치/보스점수·6단계campaignComplete를확인한다.
- 테스트만의단계별탐색은`DISCOVER_SOLUTIONS=1`일때활성화한다. private loadStage를typed harness로호출해단일레벨의canonical초기상태를만들수있지만,정규캠페인재생은publicAPI순차진행만쓴다. body삭제/HP조작/무적egg/아이템무료재충전은허용하지않는다.
- 탐색후보:발사각15/25/35/45/55/65도,drag비율0.75/1.0,스킬지연null/350/700ms의36조합. aim={x:160-cos(angle)*125*ratio,y:525+sin(angle)*125*ratio}. 최대beam폭3,탄환수만큼깊이탐색하며각prefix는새canonical월드에서실제재생한다. 평가점수는처치수×1000+제거한catHP+파괴블록수×20,인질사망/LOST/12초시간초과후보는폐기한다. 동일전개는shotskey로중복제거한다. 단계당최대2,000,000simulationsteps,초과하면자동실패보고. seed가필요하면tests에서만고정하고production난수정책은바꾸지않는다.
- 탐색해법은수치데이터로fixture에기록하고정규검증에서는탐색을돌리지않는다. 해법을못찾으면대상레벨만작게조정하고그레벨탐색/전체고정재생을반복한다. 위치조정시최소간격·초기안정성·타이어/톱니/샹들리에/방패/TNT존재·호스트패배가능성은유지한다. 변경한수치·이유·해법을보고서에기록한다. testtimeout은탐색모드30분/정규120초로분리한다.

### I02. 브라우저 테스트 설정과 개발 전용 장면 하네스
- Related Files:
  - `apps/web/package.json`, `package-lock.json` :: devDependencies/`test:e2e` — 브라우저검증도구; modify
  - `apps/web/playwright.config.ts` :: projects/webServer — new
  - `apps/web/e2e/scene-harness.html`, `apps/web/e2e/scene-harness.tsx` :: 개발전용fixture화면 — new
  - `apps/web/e2e/hud-and-input.spec.ts`, `apps/web/e2e/scenes-and-effects.spec.ts`, `apps/web/e2e/journey.spec.ts` — new
  - `.gitignore` :: Playwright일반임시결과 — modify-if-needed

#### Details
- 설치커맨드:`npm.cmd install --save-dev --save-exact --workspace @chicks-cannon/web @playwright/test`,이어서`npm.cmd exec --workspace @chicks-cannon/web -- playwright install chromium`. 의존성은web개발전용이며resolvedversion을lock에고정한다. 현재스킬계획단계에서이커맨드를실행하지않는다.
- script`test:e2e`=`playwright test`;config testDir='./e2e',testMatch='**/*.spec.ts',workers1,retries0,baseURL=http://127.0.0.1:4173,trace='retain-on-failure',testtimeout60s. projects는chromium-desktop(1440×900),chromium-small(320×740),chromium-mobile(390×844),모두Chromium. webServer명령=`npm run dev -- --host 127.0.0.1 --port 4173 --strictPort`,timeout120s,reuseExistingServerfalse. 이미사용중포트는실패사유로알리고다른프로세스를임의종료하지않는다.
- 실제입력/대화/홈/버터/pause테스트는`/`의실제App을쓴다. API서버에의존하지않도록테스트에서`**/api/leaderboard*`만정해진정상fixture로route한다. 로그인/배포/외부서비스는사용하지않는다.
- 여섯장시각fixture는`/e2e/scene-harness.html`에서현재GameHud·GameCanvas와동일한frame구조/CSS,실제GameCanvasRenderer·ChickCannonEngine을사용해렌더한다. harness내typedprivatecast로loadStage만선택하고snapshot으로그린다. `window.__sceneHarness`는이개발용페이지에만선언하며`setScene(stage,state)`, `renderAt(timeMs,impacts?)`, `getSnapshot()`을제공한다. ReactHUD와renderer에동일snapshot을주고GameHudcallbacks/PointerInputController는실제엔진으로연결한다. production의App/engine/hook에windowcheat/테스트쿼리파라미터를추가하지않는다.
- harnessHTML은Viteproductionentry에등록하지않는다. web build의dist에e2eHTML/fixtureJS/`__sceneHarness`문자열이없는지확인한다. `/`실제App의경로에서디버그핸들을노출하면검증실패다. Jua폰트와SVGprop로드를`document.fonts.ready`/필요이미지로드완료로기다린뒤캡처한다. 시간은fixture에서고정해스크린샷비교가흔들리지않게한다.

### I03. 측정·조작·스크린샷·검증 보고
- Related Files:
  - `apps/web/e2e/*.spec.ts` :: browserassertions — new
  - `apps/web/src/styles.css` :: 실측에서발견한겹침만수정; modify-if-needed
  - `apps/web/src/game/renderer.ts`, `character-renderer.ts`, `impact-renderer.ts` :: 시각회귀수정만; modify-if-needed
  - `.memory/reports/2026-10-21-chicks-cannon-six-levels-and-feedback/verification.md` 및 screenshots — new

#### Details
- 레이아웃:세viewport에서topbar세그룹의boundingClientRect가pairwise교차하지않고frame안에있음,#item-bar의4개button이같은행이며topbar와겹치지않음,doc.scrollWidth<=innerWidth,좌우3개actions각최소30px,모바일dock각최소44px. score9999999999와5탄환fixture도검증한다. 모달열림은HUD보다앞에있고document.elementFromPoint에서modal영역내HUDbutton이선택되지않아야한다. 초점tab으로하단item에접근할수없어야한다.
- 실제입력:Canvasrect와1280×720letterbox로WORLD.cannon을CSS좌표로계산해드래그발사,activeSkill한번,버터버튼→블록/지면tap후수량감소/강조,빈공간tap은미소모,선택중Canvas탭이스킬로가지않음,동일버튼/Escape취소,음소거버튼aria변경을검증한다. locator이름은새aria-label과수량을사용하고픽셀고정canvas좌표를가정하지않는다.
- pause:날개/바람/입자가있는장면에서pause후canvas이미지와snapshot시계/본체위치가200ms벽시계경과에도같고,resume후이어짐을확인한다. 강한hitfixture는t0/t60/t150/t700에서physics/VFX수명단계가다름(정확한60ms물리불변은T04유닛이담당). UIrect는shake중에도변하지않는다.
- 시각증거:각viewport에서6레벨AIMING screenshot,추가로loaded birdcloseup,flight wings두프레임,cat idle/hit/XXghost,star/dust/POW,버터적용,샹들리에전/후,최종map을기록한다. 확대crop과전체frame을함께써눈하이라이트·pinkears·나무결·리벳을확인한다. 모든자동결과/스크린샷을실제열어확인하고시각결함이있으면해당파일만수정한뒤영향검증을반복한다. 비어있는화면/알파누출/클리핑을단순히스크린샷파일존재로통과하지않는다.
- 보고서에는실행명령/결과,해결된package버전,viewport별이미지상대링크,단계별샷수/아이템0해법,수정한수치,초기안정성/인질보호/6장엔딩,브라우저consoleerror/failedrequest없음,알려진제약을기록한다. 외부음원이아닌합성야옹은사람이인지하는음질확인을별도기재하고자동AudioContext스케줄테스트와혼동하지않는다.
- 외부다운로드/브라우저가없으면해당검증을성공으로표시하지않는다. 실행환경이허용하는안전한설치/읽기확인을먼저하고해결불가면T08에서멈춰완료상태를만들지않는다. 사용자파일·다른서버프로세스삭제/중단을하지않는다.

## Acceptance Criteria
- [ ] 실제샷/스킬만으로6단계를순서대로완료하고아이템재고를소모하지않는fixture가재현된다.
- [ ] 320px/390px/desktop에서상단3그룹·하단4버튼·modal·지도에겹침/잘림/오버플로가없다.
- [ ] 여섯테마/캐릭터/피격/처치/장애물을실제Chromium스크린샷으로확인했다.
- [ ] 개발용하네스는production빌드에포함되지않고전체테스트/빌드가통과한다.
- [ ] 검증보고서·Phase·Plan·current포인터가모든필수검증후에만완료상태가된다.

## Validation
- 최초해법탐색(필요시): PowerShell `$env:DISCOVER_SOLUTIONS='1'` 설정 후 `npm.cmd run test --workspace @chicks-cannon/web -- src/game/campaign-playthrough.test.ts`; 이후 `Remove-Item Env:\DISCOVER_SOLUTIONS`로해제한다. 탐색그자체는정규회귀대체가아니다.
- `npm.cmd run test --workspace @chicks-cannon/web -- src/game/campaign-playthrough.test.ts`
- `npm.cmd run test:e2e --workspace @chicks-cannon/web`
- `npm.cmd test`
- `npm.cmd run build`
- `git diff --check`
- production dist에e2e하네스부재확인과스크린샷열람결과를보고서에기록한다.

## Commit Message
```text
test(game): verify six-stage balance and browser presentation

Plan: 2026-10-21-chicks-cannon-six-levels-and-feedback
Phase: P01-campaign-and-game-feel
Task: T08-browser-and-balance

- Replay real item-free solutions and verify mobile and desktop layouts
- Record scene screenshots and integration validation evidence
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
