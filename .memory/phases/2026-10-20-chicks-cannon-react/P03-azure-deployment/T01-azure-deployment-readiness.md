# Task: T01 Azure 배포 설정과 안내

## Status: pending

## Goal
React 정적 앱, Azure Functions leaderboard API, Azure SQL Database를 Azure Static Web Apps에 연결해 배포할 수 있는 설정·인프라 템플릿·작업 안내를 저장소에 추가한다. 이 Task는 템플릿과 문서만 만들며 Azure 리소스를 실제 생성하거나 배포하지 않는다.

## Decision Summary
- 구성은 Azure Static Web Apps Standard + 별도 Azure Functions(Node.js v4) + Azure SQL Database다. Static Web Apps의 bring-your-own Functions API 연결에는 Standard 플랜이 필요하다.
- 브라우저 요청은 Static Web Apps의 `/api` 라우트를 통해 함수 앱에 전달한다. Functions는 Azure SQL managed identity/passwordless 인증을 사용한다.
- 실제 리소스 생성과 배포는 사용자 단계다. 연결된 함수 앱과 SQL 인증은 안내에 수동 단계로 명시한다.
- References: [Static Web Apps BYO Functions](https://learn.microsoft.com/azure/static-web-apps/functions-bring-your-own), [Node.js Functions v4](https://learn.microsoft.com/azure/azure-functions/functions-reference-node), [Azure SQL Node.js passwordless quickstart](https://learn.microsoft.com/azure/azure-sql/database/azure-sql-javascript-mssql-quickstart), [Static Web Apps config](https://learn.microsoft.com/azure/static-web-apps/configuration).

## Implementation

### I01. 정적 앱/Functions 배포 설정
- Related Files:
  - `apps/web/staticwebapp.config.json` :: SPA navigation fallback, headers, API path handling; new
  - `apps/api/host.json` :: Functions v4 host runtime config; modify
  - `.github/workflows/deploy-web.yml` :: Static Web Apps GitHub Actions workflow; new
  - `.github/workflows/deploy-api.yml` :: Azure Functions GitHub Actions workflow; new
  - `.gitignore` :: build output, local env and secrets; modify

#### Details
- `staticwebapp.config.json`: SPA fallback to `/index.html`; exclude `/assets/*`, `/favicon.ico`, and `/api/*` from rewrite; do not set a front-end route rule that blocks anonymous leaderboard API requests. Add only non-breaking security headers (`X-Content-Type-Options`, `Referrer-Policy`, frame policy compatible with this app); avoid CSP that blocks Vite-built assets or local SVGs.
- `host.json`: Functions runtime v4 and `/api` route prefix; logging defaults without request body or nickname/participant data. Function App must keep this prefix because Static Web Apps proxies the `/api` route unchanged.
- Web workflow triggers on main branch push and manual dispatch. Use official `Azure/static-web-apps-deploy` action; `app_location: apps/web`, `api_location: ""` (BYO Function backend), `output_location: dist`, token from GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN`. Build uses Node LTS and `npm ci` at repository root then `npm run build --workspace @chicks-cannon/web`.
- API workflow triggers on main branch push touching `apps/api/**` and manual dispatch. Build workspace with `npm ci` and `npm run build --workspace @chicks-cannon/api`; deploy `apps/api` package via supported Azure Functions action. Configure authentication with GitHub OIDC (`azure/login@v2`) and documented `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` repository variables/secrets; no publish profile or static credentials in source. Workflow must not run `az deployment` or create Azure resources.
- `.gitignore` excludes `node_modules/`, `apps/*/dist/`, `.env`, `.env.*` except `.env.example`, `local.settings.json`, test coverage and generated artifacts.

### I02. Azure infrastructure as code and SQL identity grant
- Related Files:
  - `infra/main.bicep` :: parameterized resource entrypoint — app/storage/SQL resources; new
  - `infra/parameters.example.json` :: non-secret example parameters; new
  - `infra/sql/002-grant-function-identity.sql` :: least-privilege SQL user and data roles; new
  - `infra/README.md` :: resource topology and deployment commands; new

#### Details
- **Resources and outputs**:
  - `Microsoft.Web/staticSites` Standard plan for React static app.
  - Storage account + Linux Function App plan + Function App (Node.js LTS runtime; Functions runtime v4), system-assigned managed identity enabled.
  - Azure SQL logical server with Microsoft Entra administrator configured as a deployment parameter, and Azure SQL database. Do not put SQL password or admin secret in Bicep parameters/output.
  - Function App settings: `LEADERBOARD_STORE=sql`, `AZURE_SQL_SERVER=<logical-server>.database.windows.net`, `AZURE_SQL_DATABASE=<db>`, `FUNCTIONS_WORKER_RUNTIME=node`, `WEBSITE_RUN_FROM_PACKAGE=1` as appropriate for selected Functions plan. Emit resource names/hostnames, never secrets.
  - Parameters: location, resource name prefix, SQL database name/SKU, Function plan SKU, SWA name; set safe development-cost defaults where allowed and document that SKU/cost vary by subscription/region.
- Bicep creates resources only when a user later runs its command; this Task only checks syntax via `az bicep build`. Use current stable resource API versions when implementing and avoid provider aliases not available in the selected subscription.
- SQL grant script runs after DB/table migration and Entra admin configuration: create database user mapped to Function App system identity `FROM EXTERNAL PROVIDER`; grant only `db_datareader` and `db_datawriter` needed for ranking tables (do not grant `db_owner`). Document that identity name must match actual Function App resource name and SQL server public network/firewall must permit intended app access; do not weaken to all-IP firewall rule in template.
- `infra/README.md` gives commands in safe order: Bicep build; review `what-if`; only user runs subscription deployment; apply `apps/api/sql/001-leaderboard.sql`; execute identity grant script as Entra SQL admin; link Function API with `az staticwebapp functions link -n <swa> -g <rg> --function-resource-id <function-resource-id>`; store GitHub OIDC principal/variables; run workflows; smoke test `/api/leaderboard`.

### I03. Deployment guide and local setup guide
- Related Files:
  - `docs/azure-deployment.md` :: prerequisites, create/link/deploy/verify/rollback steps; new
  - `docs/local-development.md` :: local web/API, in-memory data limits, commands; new

#### Details
- Deployment guide distinguishes resources provisioned by Bicep from the manual identity grant, SWA-to-Functions link, and GitHub OIDC setup. It states the BYO API Standard tier prerequisite and that API linkage is unavailable in SWA PR preview environments; provide production/staging guidance without claiming preview deployments work.
- Explain that local API memory resets on process restart and does not create cross-device shared rankings; Azure SQL persistence becomes active only after deployment config is set to `LEADERBOARD_STORE=sql` and DB migration/identity are in place.
- Provide exact local commands `npm ci`, `npm run build`, `npm test`, `npm run dev:api`, `npm run dev:web`; mention Azure Functions Core Tools requirement for local API and that local web Vite proxy targets `127.0.0.1:7071`.
- No actual Azure resource command is run by docs authoring or validation. No credentials, connection strings, subscription IDs, app tokens, or private endpoints are committed.

## Acceptance Criteria
- [ ] Static Web Apps build config leaves `/api` for linked Function App and routes client paths to React SPA.
- [ ] Infrastructure template describes the three confirmed Azure services and managed identity SQL access without embedding credentials.
- [ ] Separate web/API workflows build the correct workspaces and require external GitHub configuration; they do not create infrastructure.
- [ ] Deployment guide states actual Azure resource creation/deployment remains a user action and documents local memory reset and BYO API tier constraints.
- [ ] Bicep, workflows, and documentation contain no secrets.

## Validation
- `az bicep build --file infra/main.bicep` — template syntax valid; no deployment occurs.
- `npm run build` — web/API packages build locally.
- `npm test` — all existing workspace tests pass.
- Manually review workflow YAML and docs for correct app paths, `api_location: ""`, `/api` proxy, and absent credential values; no cloud deployment command is executed.

## Commit Message
```text
chore(azure): prepare Static Web Apps and leaderboard deployment

Plan: 2026-10-20-chicks-cannon-react
Phase: P03-azure-deployment
Task: T01-azure-deployment-readiness

- Add parameterized Azure infrastructure and SQL identity setup
- Document local development and Azure deployment steps
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
