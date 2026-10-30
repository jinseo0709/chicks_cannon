# Microsoft company sign-in for leaderboard

The leaderboard accepts score submissions only from a Microsoft Entra ID
company tenant. The browser signs in with MSAL and requests a delegated access
token for the leaderboard API. The API verifies the token signature, issuer,
tenant, audience, expiry, calling SPA, delegated scope, and user object ID before accepting a score. Public
leaderboard rows contain only a player chosen nickname and an opaque ID derived
from the tenant and user object ID; corporate email and display name are not
stored or returned.

The opening screen requires sign-in before entering the game. After the final
campaign ending, the score is submitted automatically using the saved nickname,
or the generic `병아리 모험가` nickname for a first-time player.

## Entra app registrations

Create two registrations in the company's Entra tenant:

1. **Leaderboard API**: single tenant, Accounts in this organizational
   directory only. Under **Expose an API**, set the Application ID URI to
   `api://<API_CLIENT_ID>` and add a delegated scope named `access_as_user`.
   Configure the API to issue v2 access tokens (`requestedAccessTokenVersion`
   `2`). The accepted token audience (`aud`) will be the API application's
   client ID GUID.
2. **Leaderboard web app**: single tenant, Accounts in this organizational
   directory only. Add a **Single-page application** redirect URI for local
   development (`http://localhost:5173`) and the production Static Web App
   origin (`https://<STATIC_WEB_APP_HOSTNAME>`). Add API permission for the
   API's `access_as_user` delegated scope. Grant tenant admin consent if company
   policy requires it.

The GitHub Pages build is a static demo and has no linked leaderboard API. The
Microsoft sign-in button is therefore only enabled in builds supplied with the
Entra variables and intended to run on the Static Web App/API deployment.

## Configuration

For local web development, copy `apps/web/.env.example` to
`apps/web/.env.local` and set:

- `VITE_ENTRA_TENANT_ID`: company tenant GUID.
- `VITE_ENTRA_CLIENT_ID`: **web app** registration's client/application ID.
- `VITE_ENTRA_API_SCOPE`: `api://<API_CLIENT_ID>/access_as_user`.

Set these GitHub Actions repository variables for the Static Web App build:

- `ENTRA_TENANT_ID`
- `ENTRA_SPA_CLIENT_ID`
- `ENTRA_API_SCOPE`

Set `entraTenantId`, `entraApiAudience` (the API application's client ID GUID),
and `entraSpaClientId` (the web app's client ID) in the private Bicep parameters
file, then redeploy the Function App settings. For an already provisioned
Function App, add app settings `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, and
`ENTRA_SPA_CLIENT_ID` directly in Azure. The API fails closed with HTTP 503
when these settings are missing.

The web client ID and scope are public application configuration, not secrets.
Never put a client secret in Vite variables or the browser bundle. The API uses
Microsoft's published signing keys and does not need a client secret.

## Local run

Run Vite and Functions as usual after configuring `.env.local`. Ensure the
local SPA redirect URI is registered. For API requests, set
`ENTRA_TENANT_ID` and `ENTRA_API_AUDIENCE` in the API process environment. A
company account with permission to use the app can then submit the campaign
score using a public nickname of their choice.
